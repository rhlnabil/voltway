package com.voltway.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "favorite_stations",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "ocm_station_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FavoriteStation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "ocm_station_id", nullable = false)
    private Long ocmStationId;

    @Column(name = "station_name", nullable = false)
    private String stationName;

    @Column(nullable = false)
    private BigDecimal latitude;

    @Column(nullable = false)
    private BigDecimal longitude;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}