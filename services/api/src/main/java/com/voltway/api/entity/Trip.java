package com.voltway.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "trips")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Column(name = "start_label", nullable = false)
    private String startLabel;

    @Column(name = "start_lat", nullable = false)
    private BigDecimal startLat;

    @Column(name = "start_lon", nullable = false)
    private BigDecimal startLon;

    @Column(name = "end_label", nullable = false)
    private String endLabel;

    @Column(name = "end_lat", nullable = false)
    private BigDecimal endLat;

    @Column(name = "end_lon", nullable = false)
    private BigDecimal endLon;

    @Column(name = "distance_km", nullable = false)
    private BigDecimal distanceKm;

    @Column(name = "duration_s", nullable = false)
    private Integer durationS;

    @Column(name = "stops_needed")
    private Integer stopsNeeded;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TripStation> stations;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}