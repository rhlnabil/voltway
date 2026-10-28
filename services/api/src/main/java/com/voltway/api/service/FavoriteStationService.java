package com.voltway.api.service;

import com.voltway.api.dto.CreateFavoriteRequest;
import com.voltway.api.dto.FavoriteStationDto;
import com.voltway.api.entity.FavoriteStation;
import com.voltway.api.entity.User;
import com.voltway.api.repository.FavoriteStationRepository;
import com.voltway.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FavoriteStationService {

    private final FavoriteStationRepository repo;
    private final UserRepository userRepository;

    public List<FavoriteStationDto> findByUser(Long userId) {
        return repo.findByUserId(userId).stream().map(this::toDto).toList();
    }

    @Transactional
    public FavoriteStationDto add(CreateFavoriteRequest req) {
        if (repo.existsByUserIdAndOcmStationId(req.getUserId(), req.getOcmStationId())) {
            throw new IllegalArgumentException("Station already in favorites");
        }
        User user = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        FavoriteStation f = FavoriteStation.builder()
                .user(user)
                .ocmStationId(req.getOcmStationId())
                .stationName(req.getStationName())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .build();

        return toDto(repo.save(f));
    }

    @Transactional
    public void remove(Long userId, Long ocmStationId) {
        repo.findByUserId(userId).stream()
                .filter(f -> f.getOcmStationId().equals(ocmStationId))
                .findFirst()
                .ifPresent(repo::delete);
    }

    private FavoriteStationDto toDto(FavoriteStation f) {
        return FavoriteStationDto.builder()
                .id(f.getId())
                .ocmStationId(f.getOcmStationId())
                .stationName(f.getStationName())
                .latitude(f.getLatitude())
                .longitude(f.getLongitude())
                .build();
    }
}