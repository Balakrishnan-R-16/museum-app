package com.museum.ticketbooking.repository;

import com.museum.ticketbooking.model.Visitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface VisitorRepository extends JpaRepository<Visitor, Long> {
    Optional<Visitor> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<Visitor> findByGoogleSubject(String googleSubject);
}
