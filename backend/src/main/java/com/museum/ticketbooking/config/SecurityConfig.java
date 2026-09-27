package com.museum.ticketbooking.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .httpBasic(httpBasic -> httpBasic.disable())
            .formLogin(form -> form.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                // Museum owner endpoints — require MUSEUM role
                .requestMatchers(new AntPathRequestMatcher("/api/owner/**")).hasRole("MUSEUM")

                // Visitor authenticated endpoints — require VISITOR role
                .requestMatchers(new AntPathRequestMatcher("/api/visitor/tickets")).hasRole("VISITOR")
                .requestMatchers(new AntPathRequestMatcher("/api/visitor/tickets/**")).hasRole("VISITOR")
                .requestMatchers(new AntPathRequestMatcher("/api/visitor/reviews")).hasRole("VISITOR")
                .requestMatchers(new AntPathRequestMatcher("/api/visitor/reviews/**")).hasRole("VISITOR")
                .requestMatchers(new AntPathRequestMatcher("/api/visitor/auth/me")).hasRole("VISITOR")

                // Visitor auth public endpoints (register, login, google)
                .requestMatchers(new AntPathRequestMatcher("/api/visitor/auth/register")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/visitor/auth/login")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/visitor/auth/google")).permitAll()

                // Public share link for tickets
                .requestMatchers(new AntPathRequestMatcher("/api/visitor/tickets/by-token/**")).permitAll()

                // Existing public endpoints
                .requestMatchers(new AntPathRequestMatcher("/api/public/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/public/ai/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/museums/register")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/museums/login")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/museums/google")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/tickets/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/payments/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/museums/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/shows/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/h2-console/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/uploads/**")).permitAll()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.disable()));

        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
