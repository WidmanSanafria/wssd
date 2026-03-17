package com.wssd.module.session;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnonSessionRepository extends JpaRepository<AnonSession, String> {
}
