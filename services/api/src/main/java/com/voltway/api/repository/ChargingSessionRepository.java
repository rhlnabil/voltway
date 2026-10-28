// ChargingSessionRepository.java
package com.voltway.api.repository;

import com.voltway.api.entity.ChargingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChargingSessionRepository extends JpaRepository<ChargingSession, Long> {
    List<ChargingSession> findByUserIdOrderByStartedAtDesc(Long userId);
}