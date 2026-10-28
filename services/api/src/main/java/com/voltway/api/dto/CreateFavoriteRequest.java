package com.voltway.api.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateFavoriteRequest {

    @NotNull
    private Long userId;

    @NotNull
    private Long ocmStationId;

    @NotBlank
    private String stationName;

    @NotNull
    private BigDecimal latitude;

    @NotNull
    private BigDecimal longitude;
}