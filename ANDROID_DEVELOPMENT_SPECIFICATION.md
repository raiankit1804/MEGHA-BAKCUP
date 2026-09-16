# MEGHA-SETU (मेघ सेतु) — Android Development Master Specification

> **Full-Stack Android Architecture, UI/UX Blueprint & API Integration Guide**  
> **Target OS**: Android 8.0+ (API 26 to API 35+)  
> **Recommended Native Stack**: Kotlin + Jetpack Compose (Material 3) + Coroutines + Retrofit + Hilt  
> **Cross-Platform Alternative**: Flutter (Dart) or React Native  

---

## 1. Executive Summary & Objective

This document provides complete, pixel-accurate engineering specifications to replicate the **MEGHA-SETU Modern Frontend** natively on Android. 

It covers:
1. **Design System & Theme Tokens**: Modern Dark-only lock, futuristic emerald/cyan palette, glassmorphism, typography, and elevation.
2. **Interactive 3D Fluid Orb (`FuturisticOrb`)**: Mathematical physics formulas, wave deformation algorithms, particle engines, and Jetpack Compose canvas implementation.
3. **Screens & Component Architecture**: TopBar, Cyber Flash Screen, Modern Landing Page, Recommendation Cards, Chat Input with Domain Mode Selector, and Interactive Weather Card.
4. **Modals & Hardware Integrations**: Emergency SOS direct dialer, IMD Satellite/Doppler viewer, Disaster Warning Bulletin, Voice STT (Speech-to-Text), and TTS (Text-to-Speech).
5. **API Contracts & Network Layer**: Complete JSON schemas, REST endpoints, error handling, and offline caching.
6. **22 Official Indian Languages (i18n)**: Translation matrix, language codes, and fallback pipelines.

---

## 2. Design System & Theme Tokens

### 2.1 Color Palette (Modern Dark-Mode Only)

Modern Mode is **strictly dark**. Light mode must be disabled or hidden in Modern view.

| Token Name | Hex Code | Compose Color Definition | Usage |
| :--- | :--- | :--- | :--- |
| `BgBase` | `#030712` | `Color(0xFF030712)` | Main window background (Deep Obsidian) |
| `BgSurface` | `#0b1329` | `Color(0xFF0B1329)` | Card surfaces & modal containers |
| `BgGlass` | `rgba(15, 23, 42, 0.75)` | `Color(0xBF0F172A)` | Frosted glass backgrounds with blur |
| `AccentEmerald` | `#10b981` | `Color(0xFF10B981)` | Primary brand color, orb core, glow effects |
| `AccentCyan` | `#06b6d4` | `Color(0xFF06B6D4)` | Secondary accent, interactive icons, send button |
| `AccentMint` | `#34d399` | `Color(0xFF34D399)` | Highlight badges, active indicators, live radar |
| `BorderSubtle` | `rgba(52, 211, 153, 0.18)` | `Color(0x2E34D399)` | Glowing borders, cards, and input boundaries |
| `BorderGlass` | `rgba(255, 255, 255, 0.08)` | `Color(0x14FFFFFF)` | Subtle chip and pill separators |
| `WarningYellow` | `#f59e0b` | `Color(0xFFF59E0B)` | IMD Yellow watch, warning triangle badge |
| `AlertOrange` | `#f97316` | `Color(0xFFF97316)` | IMD Orange alert |
| `DangerRed` | `#ef4444` | `Color(0xFFEF4444)` | IMD Red disaster warning, SOS emergency |
| `TextPrimary` | `#ffffff` | `Color(0xFFFFFFFF)` | Main titles, user questions, temperatures |
| `TextSecondary`| `#94a3b8` | `Color(0xFF94A3B8)` | Subtitles, descriptions, timestamps |
| `TextMuted` | `#64748b` | `Color(0xFF64748B)` | Helper text, inactive icons |

### 2.2 Typography Tokens (Material 3 / Inter)

```kotlin
val MeghaTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        letterSpacing = (-0.02).sp,
        color = Color.White
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 26.sp,
        letterSpacing = (-0.02).sp,
        color = Color.White
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        color = Color.White
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        color = Color(0xFF94A3B8)
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 11.sp,
        letterSpacing = 0.08.sp,
        color = Color(0xFF34D399)
    )
)
```

---

## 3. The 3D Fluid Interactive Orb (`FuturisticOrb`)

The central green fluid object is the flagship visual of MEGHA-SETU. It continuously oscillates using a multi-frequency harmonic sinusoidal deformation algorithm on a 2D/3D canvas.

### 3.1 Physics & Mathematical Model

The blob outline is calculated through $N = 36$ radial vertices spaced around a circle:

$$\theta_i = \frac{2\pi \cdot i}{N}$$

For each angle $\theta_i$, radial perturbation $R(\theta_i, t)$ is calculated:

$$R(\theta_i, t) = R_0 + \sum_{k=1}^{3} A_k \cdot \sin(f_k \cdot \theta_i + \omega_k \cdot t + \phi_k)$$

Where:
- $R_0 = 54\text{dp}$ (Base radius)
- **Harmonics**:
  - Wave 1: $A_1 = 14\text{dp}, f_1 = 3, \omega_1 = 1.6$
  - Wave 2: $A_2 = 10\text{dp}, f_2 = 5, \omega_2 = -2.1$
  - Wave 3: $A_3 = 6\text{dp}, f_3 = 7, \omega_3 = 3.2$

#### Voice Reactive Modulation (`isListening == true`):
When user clicks the microphone, the listening mode activates:
1. Wave amplitude increases by $1.8\times$.
2. Rotation speed increases by $2.5\times$.
3. Concentric acoustic waves expand radially outward:
   $$R_{\text{acoustic}}(t) = (R_0 + 20) + (t \pmod{1.2}) \cdot 70$$
4. Voice aura pulsates with opacity $\alpha \in [0.4, 0.85]$.

### 3.2 Jetpack Compose Implementation

```kotlin
package com.meghasetu.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.*

@Composable
fun FuturisticOrb(
    modifier: Modifier = Modifier,
    size: Dp = 200.dp,
    isListening: Boolean = false,
    showGrid: Boolean = false,
    onClick: () -> Unit = {}
) {
    val infiniteTransition = rememberInfiniteTransition(label = "orb_anim")
    val time by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 2f * PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = if (isListening) 2200 else 5500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "time_phase"
    )

    Canvas(
        modifier = modifier
            .size(size)
            .pointerInput(Unit) {
                detectTapGestures { onClick() }
            }
    ) {
        val cx = size.toPx() / 2f
        val cy = size.toPx() / 2f
        val baseRadius = size.toPx() * 0.28f

        // 1. Ambient Radial Glow
        val glowRadius = size.toPx() * if (isListening) 0.55f else 0.45f
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    Color(0xFF10B981).copy(alpha = if (isListening) 0.45f else 0.25f),
                    Color(0xFF06B6D4).copy(alpha = 0.12f),
                    Color.Transparent
                ),
                center = Offset(cx, cy),
                radius = glowRadius
            ),
            radius = glowRadius,
            center = Offset(cx, cy)
        )

        // 2. Concentric Acoustic Waves (Listening mode)
        if (isListening) {
            for (i in 0..2) {
                val wavePhase = (time + i * 1.8f) % (2f * PI.toFloat())
                val waveProgress = wavePhase / (2f * PI.toFloat())
                val currentRadius = baseRadius + waveProgress * 65f
                val waveAlpha = (1f - waveProgress) * 0.6f

                drawCircle(
                    color = Color(0xFF34D399).copy(alpha = waveAlpha),
                    radius = currentRadius,
                    center = Offset(cx, cy),
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.dp.toPx())
                )
            }
        }

        // 3. Fluid Blob Deformation using Cubic Bézier Path
        val points = 32
        val path = Path()
        val coords = mutableListOf<Offset>()

        for (i in 0 until points) {
            val angle = (i.toFloat() / points) * 2f * PI.toFloat()
            val amp1 = if (isListening) 18f else 12f
            val amp2 = if (isListening) 12f else 7f
            val r = baseRadius +
                    sin(angle * 3f + time * 1.6f) * amp1 +
                    cos(angle * 5f - time * 2.1f) * amp2

            val x = cx + cos(angle) * r
            val y = cy + sin(angle) * r
            coords.add(Offset(x, y))
        }

        if (coords.isNotEmpty()) {
            path.moveTo((coords[0].x + coords.last().x) / 2f, (coords[0].y + coords.last().y) / 2f)
            for (i in coords.indices) {
                val nextIdx = (i + 1) % coords.size
                val midX = (coords[i].x + coords[nextIdx].x) / 2f
                val midY = (coords[i].y + coords[nextIdx].y) / 2f
                path.quadraticBezierTo(coords[i].x, coords[i].y, midX, midY)
            }
            path.close()
        }

        // Fill fluid core
        drawPath(
            path = path,
            brush = Brush.radialGradient(
                colors = listOf(
                    Color(0xFF34D399),
                    Color(0xFF10B981),
                    Color(0xFF047857)
                ),
                center = Offset(cx - 15f, cy - 15f),
                radius = baseRadius * 1.2f
            )
        )

        // Outline contour
        drawPath(
            path = path,
            color = Color(0xFF6EE7B7).copy(alpha = 0.85f),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.dp.toPx())
        )
    }
}
```

---

## 4. Modern Cyber Flash Screen (`ModernFlashScreen`)

Triggered whenever the user transitions into Modern Mode from settings or startup.

### 4.1 Specification
- **Duration**: 1500 ms (auto-dismiss or tap to skip).
- **Background**: Solid `#030712` (no transparency bleed).
- **Ambient Aura**: Emerald & Cyan radial shockwave blur.
- **HUD Telemetry Badge**: `● SYSTEM PROTOCOL // CYBER INTELLIGENCE`
- **Center Element**: `FuturisticOrb(size = 170.dp, showGrid = false)`.
- **Title**: `MEGHA-SETU` (28sp, Bold, Neon glow shadow).
- **Subtitle**: `MODERN MODE INITIALIZED // DARK PROTOCOL ACTIVE` (11sp).
- **Progress Track**: 200dp wide animated neon progress line from 0% to 100%.

### 4.2 Jetpack Compose Implementation

```kotlin
@Composable
fun ModernFlashScreen(
    onDismiss: () -> Unit
) {
    val progress = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 1300, easing = FastOutSlowInEasing)
        )
        delay(200)
        onDismiss()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF030712))
            .clickable { onDismiss() },
        contentAlignment = Alignment.Center
    ) {
        // Ambient Radial Glow
        Box(
            modifier = Modifier
                .size(340.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            Color(0xFF10B981).copy(alpha = 0.25f),
                            Color(0xFF06B6D4).copy(alpha = 0.15f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // HUD Protocol Tag
            Surface(
                color = Color(0x99064E3B),
                shape = RoundedCornerShape(percent = 50),
                border = BorderStroke(1.dp, Color(0x6634D399))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .background(Color(0xFF34D399), shape = CircleShape)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "SYSTEM PROTOCOL // CYBER INTELLIGENCE",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF6EE7B7)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 3D Fluid Orb
            FuturisticOrb(size = 170.dp, showGrid = false)

            Spacer(modifier = Modifier.height(20.dp))

            // Title
            Text(
                text = "MEGHA-SETU",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "MODERN MODE INITIALIZED // DARK PROTOCOL ACTIVE",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF94A3B8)
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Neon Progress Track
            Box(
                modifier = Modifier
                    .width(220.dp)
                    .height(4.dp)
                    .background(Color(0x26FFFFFF), shape = RoundedCornerShape(2.dp))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(progress.value)
                        .background(
                            Brush.horizontalGradient(
                                listOf(Color(0xFF06B6D4), Color(0xFF10B981), Color(0xFF34D399))
                            ),
                            shape = RoundedCornerShape(2.dp)
                        )
                )
            }
        }
    }
}
```

---

## 5. Screen Layout & Component Architecture

### 5.1 Screen Hierarchy

```
MainActivity
└── MeghaNavHost
    ├── Screen: ChatDashboard (Main Landing & Conversation)
    │   ├── TopBar
    │   │   ├── SidebarDrawerButton
    │   │   ├── LocationPickerDropdown (GPS + District Search)
    │   │   ├── AlertsButton (⚠️ Red/Yellow pulse badge)
    │   │   ├── SatelliteButton (🛰️ IMD Viewer)
    │   │   ├── LanguageDropdown (22 Indian Languages)
    │   │   └── ProfileSettingsButton
    │   │
    │   ├── ContentArea
    │   │   ├── State A: ModernLandingPage (When chat history is empty)
    │   │   │   ├── FuturisticOrb (Touch & Mic Reactive)
    │   │   │   ├── LocalizedHeadline ("What can I help with?" / "मैं आपकी क्या मदद कर सकता हूँ?")
    │   │   │   ├── ThreeRecommendationCards (Grid 3 cols on tablet, 1-3 on phone)
    │   │   │   │   ├── Card 1: AgriSense (Farm Weather & Sowing)
    │   │   │   │   ├── Card 2: Storm & Radar (IMD Doppler Warnings)
    │   │   │   │   └── Card 3: Urban Commute (Waterlogged Underpass Avoidance)
    │   │   │   └── HeroInputCard
    │   │   │
    │   │   └── State B: ConversationFeed (When messages > 0)
    │   │       ├── LazyColumn Messages
    │   │       │   ├── UserMessageBubble
    │   │       │   ├── WeatherCard (Interactive 24h & 6-day metrics)
    │   │       │   ├── AssistantAdvisoryBubble (Markdown + TTS audio button)
    │   │       │   └── FollowupChipsRow (Localized clickable prompts)
    │   │       └── DockedBottomInputBar
    │   │
    │   └── Modals & Sheets
    │       ├── ModernFlashScreen (On mode switch)
    │       ├── DisasterWarningModal (Full IMD warning bulletin)
    │       ├── SosModal (Direct dialing 8 national emergency lines)
    │       ├── SatelliteViewerModal (INSAT-3DS & Radar loop)
    │       ├── DistrictPickerSheet
    │       └── ProfileSettingsSheet
```

### 5.2 The 3 Modern Recommendation Cards

In modern mode, the landing screen displays 3 high-impact cards with pill badges matching the website theme:

| Card | Badge Color | Badge Label (EN / HI) | Subtitle (EN / HI) | Action Query Generated |
| :--- | :--- | :--- | :--- | :--- |
| **Card 1: AgriSense** | Cyan (`#06b6d4`) | `Farm Advisory` / `कृषि सलाह` | Help with crop health & sowing advisory / फसल स्वास्थ्य और बुवाई सलाह में सहायता | `"AgriSense farm weather and crop health advisory"` |
| **Card 2: Storm & Radar** | Salmon (`#f43f5e`) | `Storm & Radar` / `आंधी व रडार` | Track storm probability & radar ideas / आंधी की संभावना और लाइव रडार देखें | `"Live Doppler radar, storm probability and IMD warnings"` |
| **Card 3: Urban Transit** | Mint (`#34d399`) | `Urban Commute` / `शहरी यातायात` | Help avoid flooded underpasses & commute delay / जलभराव वाले अंडरपास और ट्रैफिक जाम से बचें | `"Waterlogged roads and inundated underpasses near {Location}"` |

---

## 6. Backend API Contracts & Integration

All Android network calls connect to the FastAPI backend at `http://<IP_OR_HOST>:8000`.

### 6.1 Base Retrofit Service Definition

```kotlin
interface MeghaSetuApi {

    // 1. Session & Location Resolver
    @GET("api/session")
    suspend fun getSession(
        @Query("lat") lat: Double?,
        @Query("lon") lon: Double?,
        @Query("session_id") sessionId: String?
    ): Response<SessionResponse>

    // 2. Chat Query Execution
    @POST("api/chat")
    suspend fun sendChatMessage(
        @Body request: ChatRequest
    ): Response<ChatResponse>

    // 3. Current Weather Metrics for Location
    @GET("api/weather/current")
    suspend fun getCurrentWeather(
        @Query("lat") lat: Double,
        @Query("lon") lon: Double,
        @Query("location_name") locationName: String,
        @Query("language") language: String = "en"
    ): Response<WeatherCardData>

    // 4. Live Disaster Warnings & IMD Bulletin
    @GET("api/disaster-bulletin")
    suspend fun getDisasterBulletin(
        @Query("lat") lat: Double?,
        @Query("lon") lon: Double?,
        @Query("language") language: String = "en"
    ): Response<DisasterBulletinResponse>

    // 5. IMD Satellite & Radar Feeds
    @GET("api/satellite")
    suspend fun getSatelliteImagery(
        @Query("lat") lat: Double,
        @Query("lon") lon: Double
    ): Response<SatelliteResponse>

    // 6. Indic Text-to-Speech Generation
    @POST("api/tts")
    suspend fun getTtsAudio(
        @Body request: TtsRequest
    ): Response<ResponseBody>

    // 7. Chat History
    @GET("api/history")
    suspend fun getHistory(@Query("user_id") userId: String): Response<List<ChatMessage>>

    @DELETE("api/history")
    suspend fun clearHistory(@Query("user_id") userId: String): Response<Unit>
}
```

### 6.2 Data Model Definitions

#### `ChatRequest` & `ChatResponse`
```kotlin
data class ChatRequest(
    val query: String,
    val lat: Double,
    val lon: Double,
    val location_name: String,
    val domain_filter: String = "normal", // normal, agriculture, aviation, marine, research
    val language: String = "en",
    val session_id: String? = null
)

data class ChatResponse(
    val response_text: String,
    val response_text_english: String? = null,
    val detected_language: String = "en",
    val weather_data: WeatherCardData? = null,
    val imd_warning: ImdWarningItem? = null,
    val followup_chips_native: List<String>? = null,
    val followup_chips_english: List<String>? = null,
    val domain_filter: String = "normal",
    val session_id: String
)
```

#### `WeatherCardData`
```kotlin
data class WeatherCardData(
    val location_name: String,
    val current: CurrentMetrics,
    val hourly: List<HourlyItem>,
    val daily: List<DailyItem>,
    val aqi: AqiMetrics?,
    val allergies: AllergyData?,
    val timestamp: String
)

data class CurrentMetrics(
    val temperature: Double,
    val feels_like: Double,
    val temp_min: Double,
    val temp_max: Double,
    val condition: String,
    val humidity: Int,
    val wind_speed_kmh: Double,
    val wind_direction: String,
    val pressure_hpa: Double,
    val uv_index: Double,
    val uv_category: String,
    val precipitation_prob: Int
)

data class HourlyItem(
    val time: String,
    val formatted_hour: String,
    val temperature: Double,
    val condition: String,
    val rain_prob: Int
)

data class DailyItem(
    val date: String,
    val day_label: String,
    val temp_max: Double,
    val temp_min: Double,
    val condition: String,
    val rain_prob: Int
)
```

---

## 7. Hardware & Native Android Integrations

### 7.1 Location Services (Google FusedLocationProviderClient)

```kotlin
// AndroidManifest.xml
// <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
// <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

class LocationHelper(private val context: Context) {
    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): Location? = suspendCancellableCoroutine { cont ->
        fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
            .addOnSuccessListener { loc -> cont.resume(loc) }
            .addOnFailureListener { cont.resume(null) }
    }
}
```

### 7.2 Voice Recognition / Speech-to-Text (STT)

When user taps the mic, the app listens and automatically triggers the voice ripple animation on `FuturisticOrb`:

```kotlin
class VoiceRecognizerHelper(
    private val context: Context,
    private val onResult: (String) -> Unit,
    private val onListeningChange: (Boolean) -> Unit
) : RecognitionListener {
    private val speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
        setRecognitionListener(this@VoiceRecognizerHelper)
    }

    fun startListening(langCode: String) {
        val bcp47 = when (langCode) {
            "hi" -> "hi-IN"
            "bn" -> "bn-IN"
            "te" -> "te-IN"
            "ta" -> "ta-IN"
            "mr" -> "mr-IN"
            "gu" -> "gu-IN"
            "kn" -> "kn-IN"
            "ml" -> "ml-IN"
            "pa" -> "pa-IN"
            else -> "en-IN"
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, bcp47)
        }
        speechRecognizer.startListening(intent)
        onListeningChange(true)
    }

    fun stopListening() {
        speechRecognizer.stopListening()
        onListeningChange(false)
    }

    override fun onResults(results: Bundle?) {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        matches?.firstOrNull()?.let { onResult(it) }
        onListeningChange(false)
    }
    // Implement error/readiness delegates...
}
```

### 7.3 SOS National Helpline Direct Dialing

The SOS modal triggers direct dialing via `Intent.ACTION_DIAL`:

| Service Name | Telephone URI | Direct Description |
| :--- | :--- | :--- |
| **All-in-One Emergency** | `tel:112` | Police, Fire, Ambulance universal dispatcher |
| **NDRF HQ Disaster** | `tel:1078` | National Disaster Response Force Flood/Cyclone rescue |
| **State Disaster (SDMA)** | `tel:1070` | State Emergency Operation Centre control room |
| **Indian Coast Guard** | `tel:1554` | Maritime search & rescue for fishermen at sea |
| **Emergency Ambulance** | `tel:108` | Medical trauma & emergency patient transit |
| **Fire & Rescue** | `tel:101` | Fire, building collapse & inundation rescue |
| **Kisan Call Centre** | `tel:18001801551`| Free farmer advisory on crops, pests, and rain |
| **Tele-MANAS Mental** | `tel:14416` | Psychological support during natural disasters |

```kotlin
fun dialHelpline(context: Context, phoneNumber: String) {
    val intent = Intent(Intent.ACTION_DIAL).apply {
        data = Uri.parse("tel:$phoneNumber")
    }
    context.startActivity(intent)
}
```

---

## 8. Localization: 22 Official Indian Languages Matrix

The Android app must support all 22 official languages in the 8th Schedule of the Indian Constitution + English:

| Code | Native Script | Language Name | Example Greeting |
| :--- | :--- | :--- | :--- |
| `en` | English | English | What can I help with? |
| `hi` | हिन्दी | Hindi | मैं आपकी क्या मदद कर सकता हूँ? |
| `bn` | বাংলা | Bengali | আমি কীভাবে সাহায্য করতে পারি? |
| `te` | తెలుగు | Telugu | నేను మీకు ఎలా సహాయపడగలను? |
| `mr` | मराठी | Marathi | मी तुम्हाला कशी मदत करू शकतो? |
| `ta` | தமிழ் | Tamil | நான் உங்களுக்கு எவ்வாறு உதவ முடியும்? |
| `gu` | ગુજરાતી | Gujarati | હું તમને શું મદદ કરી શકું? |
| `kn` | ಕನ್ನಡ | Kannada | ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು? |
| `ml` | മലയാളം | Malayalam | ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം? |
| `pa` | ਪੰਜਾਬੀ | Punjabi | ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ? |
| `or` | ଓଡ଼ିଆ | Odia | ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି? |
| `ur` | اردو | Urdu | میں آپ کی کیا مدد کر سکتا ہوں؟ |
| `as` | অসমীয়া | Assamese | মই আপোনাক কেনেকৈ সহায় কৰিব পাৰোঁ? |
| `mai`| मैथिली | Maithili | हम अहाँक की मद्दति कऽ सकै छी? |
| `sat`| ᱥᱟᱱᱛᱟᱲᱤ | Santali | ᱤᱧ ᱟᱢ ᱪᱮᱫ ᱜᱚᱲᱚᱢ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ? |
| `ks` | کٲشُر | Kashmiri | بؤ کیا کرتھؤ مدد؟ |
| `ne` | नेपाली | Nepali | म तपाईंलाई कसरी मद्दत गर्न सक्छु? |
| `kok`| कोंकणी | Konkani | हांव तुमकां कशी मदत करूं येता? |
| `sd` | سنڌي | Sindhi | مان اوهان جي ڇا مدد ڪري سگهان ٿو؟ |
| `doi`| डोगरी | Dogri | मूं तुंदी केह् मदद करी सकदा? |
| `mni`| মৈতৈলোন্ | Manipuri | ঐহাক্না নখোয়দা করম্না মতেং পাংবা য়াবগে? |
| `brx`| बड़ो | Bodo | आं नोंथांमोनखौ माबोरै हेफाजाब होनो हागौ? |
| `sa` | संस्कृतम् | Sanskrit | अहं भवतः कथं साहाय्यं कर्तुं शक्नोमि? |

---

## 9. Recommended Project Gradle Dependencies

```groovy
dependencies {
    // Jetpack Compose & Material 3
    implementation platform("androidx.compose:compose-bom:2024.06.00")
    implementation "androidx.compose.ui:ui"
    implementation "androidx.compose.ui:ui-graphics"
    implementation "androidx.compose.ui:ui-tooling-preview"
    implementation "androidx.compose.material3:material3"
    implementation "androidx.compose.material:material-icons-extended"
    
    // Lifecycle & Navigation
    implementation "androidx.lifecycle:lifecycle-viewmodel-compose:2.8.2"
    implementation "androidx.navigation:navigation-compose:2.7.7"
    
    // Retrofit & Moshi / KotlinX Serialization
    implementation "com.squareup.retrofit2:retrofit:2.11.0"
    implementation "com.squareup.retrofit2:converter-gson:2.11.0"
    implementation "com.squareup.okhttp3:logging-interceptor:4.12.0"
    
    // Coroutines
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1"
    
    // Google Play Services Location
    implementation "com.google.android.gms:play-services-location:21.3.0"
    
    // Coil (Image Loading for Satellite imagery)
    implementation "io.coil-kt:coil-compose:2.6.0"
    
    // ExoPlayer (For backend TTS audio streaming)
    implementation "androidx.media3:media3-exoplayer:1.3.1"
}
```

---

## 10. Development Checklist for Android Team

- [ ] **Setup Project**: Minimum SDK 26, Target SDK 35, Jetpack Compose Material 3.
- [ ] **Themes**: Create `Theme.kt` with dark-only tokens (`#030712`, `#10b981`, `#06b6d4`, `#34d399`).
- [ ] **Canvas 3D Orb**: Integrate `FuturisticOrb.kt` with cubic Bézier harmonic wave formula.
- [ ] **Cyber Flash Transition**: Implement `ModernFlashScreen.kt` with auto-dismiss timer.
- [ ] **Landing Screen**: Construct greeting, 3 prompt cards, and bottom hero input.
- [ ] **Domain Modes**: Add domain selector (City, AgriSense, SkyOps, SeaCast, Climate X).
- [ ] **Location**: Hook up `FusedLocationProviderClient` with `zoom: 16` reverse-geocoding.
- [ ] **Speech**: Connect Android `SpeechRecognizer` for live voice input with equalizer feedback.
- [ ] **Emergency SOS**: Create direct dialer sheet with 8 national helpline numbers.
- [ ] **Satellite Viewer**: Integrate INSAT-3D IR & Doppler loops via Coil image loader.
- [ ] **Localization**: Load `i18n` strings across all 22 official Indian languages.
