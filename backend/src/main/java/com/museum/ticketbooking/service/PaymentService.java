package com.museum.ticketbooking.service;

import com.museum.ticketbooking.dto.CreateOrderRequest;
import com.museum.ticketbooking.dto.PaymentVerificationRequest;
import com.museum.ticketbooking.dto.RazorpayWebhookResult;
import com.museum.ticketbooking.model.Ticket;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Service
public class PaymentService {

    private final RazorpayClient razorpayClient;
    private final TicketService ticketService;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook.secret:}")
    private String razorpayWebhookSecret;
    
    public PaymentService(RazorpayClient razorpayClient, TicketService ticketService) {
        this.razorpayClient = razorpayClient;
        this.ticketService = ticketService;
    }

    @Value("${razorpay.currency:INR}")
    private String currency;

    @Transactional
    public Map<String, Object> createOrder(CreateOrderRequest request) {
        try {
            Ticket ticket = ticketService.getTicketById(request.getTicketId());

            if ("USED".equalsIgnoreCase(ticket.getStatus()) || "CANCELLED".equalsIgnoreCase(ticket.getStatus())) {
                throw new RuntimeException("Payment order cannot be created for used or cancelled tickets");
            }
            if (ticket.getPaymentId() != null && !ticket.getPaymentId().isBlank()) {
                throw new RuntimeException("Ticket is already paid");
            }

            if (ticket.getTotalPrice() == null || ticket.getTotalPrice() <= 0) {
                throw new RuntimeException("Invalid ticket amount");
            }

            int amountInPaise = (int) Math.round(ticket.getTotalPrice() * 100);

            JSONObject options = new JSONObject();
            options.put("amount", amountInPaise);
            options.put("currency", currency);
            options.put("receipt", "ticket_" + ticket.getId());

            Order order = razorpayClient.orders.create(options);
            String razorpayOrderId = order.get("id");

            ticketService.savePaymentOrder(ticket.getId(), razorpayOrderId);

            Map<String, Object> response = new HashMap<>();
            response.put("ticketId", ticket.getId());
            response.put("ticketNumber", ticket.getTicketNumber());
            response.put("amount", amountInPaise);
            response.put("displayAmount", ticket.getTotalPrice());
            response.put("currency", currency);
            response.put("orderId", razorpayOrderId);
            response.put("razorpayKey", razorpayKeyId);
            response.put("museumName", ticket.getMuseum() != null ? ticket.getMuseum().getMuseumName() : "Museum");
            response.put("email", ticket.getUserEmail());
            response.put("phone", ticket.getPhone());

            return response;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create Razorpay order: " + e.getMessage());
        }
    }

    @Transactional
    public Map<String, Object> verifyPayment(PaymentVerificationRequest request) {
        Ticket ticket = ticketService.getTicketById(request.getTicketId());

        if ("USED".equalsIgnoreCase(ticket.getStatus()) || "CANCELLED".equalsIgnoreCase(ticket.getStatus())) {
            throw new RuntimeException("Ticket is not in payable state");
        }
        if (ticket.getPaymentId() != null && !ticket.getPaymentId().isBlank()) {
            Map<String, Object> response = new HashMap<>();
            response.put("ticketId", ticket.getId());
            response.put("ticketNumber", ticket.getTicketNumber());
            response.put("paymentId", ticket.getPaymentId());
            response.put("orderId", ticket.getOrderId());
            response.put("status", ticket.getStatus());
            response.put("message", "Payment already verified");
            return response;
        }

        boolean signatureValid = verifyCheckoutSignature(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature()
        );

        if (!signatureValid) {
            throw new RuntimeException("Invalid Razorpay signature");
        }

        ticketService.activateTicketPayment(
                ticket.getId(),
                request.getRazorpayPaymentId(),
                request.getRazorpayOrderId()
        );

        Ticket updatedTicket = ticketService.getTicketById(ticket.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("ticketId", updatedTicket.getId());
        response.put("ticketNumber", updatedTicket.getTicketNumber());
        response.put("paymentId", updatedTicket.getPaymentId());
        response.put("orderId", updatedTicket.getOrderId());
        response.put("status", updatedTicket.getStatus());
        response.put("message", "Payment verified successfully and ticket activated");

        return response;
    }

    @Transactional
    public RazorpayWebhookResult processWebhook(String rawBody, String webhookSignature) {
        if (!verifyWebhookSignature(rawBody, webhookSignature)) {
            throw new RuntimeException("Invalid webhook signature");
        }

        JSONObject payload = new JSONObject(rawBody);
        String event = payload.optString("event", "");

        if ("payment.captured".equals(event)) {
            JSONObject paymentEntity = payload
                    .getJSONObject("payload")
                    .getJSONObject("payment")
                    .getJSONObject("entity");

            String orderId = paymentEntity.optString("order_id", null);
            String paymentId = paymentEntity.optString("id", null);
            String paymentStatus = paymentEntity.optString("status", null);

            if (orderId == null || paymentId == null) {
                return new RazorpayWebhookResult(false, event, "Missing order_id or payment id");
            }

            if (!"captured".equalsIgnoreCase(paymentStatus)) {
                return new RazorpayWebhookResult(false, event, "Payment not captured");
            }

            Ticket ticket = ticketService.getTicketByOrderId(orderId);

            if ("ACTIVE".equalsIgnoreCase(ticket.getStatus()) || "USED".equalsIgnoreCase(ticket.getStatus())) {
                return new RazorpayWebhookResult(true, event, "Already processed");
            }

            if ("CANCELLED".equalsIgnoreCase(ticket.getStatus())) {
                return new RazorpayWebhookResult(false, event, "Ticket cancelled");
            }

            ticketService.activateTicketPayment(ticket.getId(), paymentId, orderId);

            Ticket updatedTicket = ticketService.getTicketById(ticket.getId());

            return new RazorpayWebhookResult(true, event, "payment.captured processed successfully");
        }

        if ("order.paid".equals(event)) {
            return new RazorpayWebhookResult(true, event, "order.paid received - no action needed because payment.captured handles activation");
        }

        return new RazorpayWebhookResult(true, event, "Webhook received but no action configured");
    }

    public Map<String, Object> getPaymentDetails(String paymentId) {
        try {
            com.razorpay.Payment payment = razorpayClient.payments.fetch(paymentId);

            Map<String, Object> response = new HashMap<>();
            response.put("id", payment.get("id"));
            response.put("status", payment.get("status"));
            response.put("amount", payment.get("amount"));
            response.put("currency", payment.get("currency"));
            response.put("method", payment.get("method"));
            response.put("email", payment.has("email") ? payment.get("email") : null);
            response.put("contact", payment.has("contact") ? payment.get("contact") : null);

            return response;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch payment details: " + e.getMessage());
        }
    }

    private boolean verifyCheckoutSignature(String orderId, String paymentId, String razorpaySignature) {
        try {
            String payload = orderId + "|" + paymentId;
            String generatedSignature = hmacHex(payload, razorpayKeySecret);
            return generatedSignature.equals(razorpaySignature);
        } catch (Exception e) {
            throw new RuntimeException("Checkout signature verification failed: " + e.getMessage());
        }
    }

    private boolean verifyWebhookSignature(String rawBody, String webhookSignature) {
        try {
            if (webhookSignature == null || webhookSignature.isBlank()) {
                return false;
            }
            String generatedSignature = hmacHex(rawBody, razorpayWebhookSecret);
            return generatedSignature.equals(webhookSignature);
        } catch (Exception e) {
            throw new RuntimeException("Webhook signature verification failed: " + e.getMessage());
        }
    }

    private String hmacHex(String payload, String secret) throws Exception {
        Mac sha256Hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        sha256Hmac.init(secretKey);

        byte[] hash = sha256Hmac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(hash);
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
