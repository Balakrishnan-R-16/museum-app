import { useState, useEffect, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import toast from 'react-hot-toast';

export const useOwnerRealtime = (museumId) => {
  const [liveStats, setLiveStats] = useState(null);
  const [liveTickets, setLiveTickets] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING'); // CONNECTING, CONNECTED, RECONNECTING, ERROR

  const connect = useCallback(() => {
    if (!museumId) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    const controller = new AbortController();
    
    setConnectionStatus('CONNECTING');

    fetchEventSource(`https://museum-backend-eb4b.onrender.com/api/owner/realtime/stream`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
      
      onopen: async (response) => {
        if (response.ok) {
          setConnectionStatus('CONNECTED');
          console.log('SSE connection opened');
        } else {
          setConnectionStatus('ERROR');
          throw new Error('Failed to connect to SSE');
        }
      },
      
      onmessage: (event) => {
        if (!event.data || event.data.includes('SSE Connect')) return;
        try {
          const data = JSON.parse(event.data);
          
          switch (event.event) {
            case 'NEW_BOOKING':
              toast.success(`New booking received: ₹${data.totalPrice}`, {
                icon: '🎫',
                style: {
                  borderRadius: '10px',
                  background: '#333',
                  color: '#fff',
                },
              });
              setLiveTickets(prev => [data, ...prev].slice(0, 50)); // Keep last 50
              break;
              
            case 'TICKET_VERIFIED':
              toast.success(`Ticket ${data.ticketNumber} verified!`, {
                icon: '✅',
                style: {
                  borderRadius: '10px',
                  background: '#10b981',
                  color: '#fff',
                },
              });
              // Update status in list if exists
              setLiveTickets(prev => prev.map(t => t.id === data.id ? data : t));
              break;
              
            case 'STATS_UPDATE':
              setLiveStats(data);
              break;
              
            case 'REVIEW_RECEIVED':
              toast(`New ${data.rating}★ review from ${data.visitorName || 'Visitor'}`, {
                icon: '⭐',
              });
              break;
              
            default:
              console.log('Unknown SSE event type:', event.event);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      },
      
      onclose: () => {
        setConnectionStatus('RECONNECTING');
        console.log('SSE connection closed. Will retry.');
        // fetchEventSource automatically retries by default
      },
      
      onerror: (err) => {
        setConnectionStatus('ERROR');
        console.error('SSE Error:', err);
        // Return time to wait before retrying (in ms)
        return 5000;
      }
    });

    return () => {
      controller.abort();
      console.log('SSE connection aborted');
    };
  }, [museumId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { liveStats, liveTickets, connectionStatus };
};
