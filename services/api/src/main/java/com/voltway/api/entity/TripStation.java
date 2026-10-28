package com.voltway.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "trip_stations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TripStation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(name = "ocm_station_id", nullable = false)
    private Long ocmStationId;

    @Column(name = "station_name", nullable = false)
    private String stationName;

    @Column(nullable = false)
    private BigDecimal latitude;

    @Column(nullable = false)
    private BigDecimal longitude;

    @Column(name = "power_kw")
    private BigDecimal powerKw;

    @Column(name = "distance_from_start_km", nullable = false)
    private BigDecimal distanceFromStartKm;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;
}