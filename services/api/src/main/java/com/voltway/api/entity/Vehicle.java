package com.voltway.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "model_name", nullable = false)
    private String modelName;

    @Column(name = "autonomy_km", nullable = false)
    private Integer autonomyKm;

    @Column(name = "battery_kwh", nullable = false)
    private BigDecimal batteryKwh;

    @Column(name = "consumption_kwh_100")
    private BigDecimal consumptionKwh100;

    @Column(name = "price_per_kwh")
    private BigDecimal pricePerKwh;

    @Column(name = "is_default")
    private Boolean isDefault;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (isDefault == null) isDefault = false;
    }
}