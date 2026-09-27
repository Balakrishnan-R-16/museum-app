package com.museum.ticketbooking.config;

import com.museum.ticketbooking.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);
            String userId = jwtUtil.extractMuseumId(token);

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                if (jwtUtil.isTokenValid(token)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    email,
                                    null,
                                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role))
                            );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Store userId and email in request attributes for downstream use
                    request.setAttribute("museumId", userId);
                    request.setAttribute("userId", userId);
                    request.setAttribute("userEmail", email);
                    request.setAttribute("userRole", role);

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Token invalid or expired — continue without authentication
            logger.debug("JWT validation failed: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip JWT filter for public endpoints
        return path.startsWith("/api/public/")
                || path.startsWith("/api/public/ai/")
                || path.startsWith("/api/museums/register")
                || path.startsWith("/api/museums/login")
                || path.startsWith("/api/visitor/auth/register")
                || path.startsWith("/api/visitor/auth/login")
                || path.startsWith("/api/visitor/auth/google")
                || path.startsWith("/api/visitor/tickets/by-token/")
                || path.startsWith("/api/tickets/")
                || path.startsWith("/api/payments/")
                || path.startsWith("/api/museums") && request.getMethod().equals("GET")
                || path.startsWith("/api/shows/")
                || path.startsWith("/h2-console")
                || path.startsWith("/uploads/");
    }
}
