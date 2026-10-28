// FavoriteStationRepository.java
package com.voltway.api.repository;

import com.voltway.api.entity.FavoriteStation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FavoriteStationRepository extends JpaRepository<FavoriteStation, Long> {
    List<FavoriteStation> findByUserId(Long userId);
    boolean existsByUserIdAndOcmStationId(Long userId, Long ocmStationId);
}