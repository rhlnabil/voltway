// TripStationRepository.java
package com.voltway.api.repository;

import com.voltway.api.entity.TripStation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TripStationRepository extends JpaRepository<TripStation, Long> {
    List<TripStation> findByTripIdOrderByOrderIndexAsc(Long tripId);
}