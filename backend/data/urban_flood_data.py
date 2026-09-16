"""
MEGHA SETU — Urban Waterlogging & Flood Vulnerability Knowledge Base
Provides chronic municipal waterlogging hotspots, low-lying underpasses, and commute advisories
for major Indian metropolitan areas based on municipal corporation data (BBMP, BMC, PWD/MCD, GCC, GHMC, etc.).
"""

from typing import Optional, Dict, Any, List

# Chronic waterlogging hotspots and vulnerable low-lying underpasses by city
URBAN_VULNERABILITY_REGISTRY: Dict[str, Dict[str, Any]] = {
    "bengaluru": {
        "city_name": "Bengaluru",
        "authority": "BBMP & Bengaluru Traffic Police (BTP)",
        "vulnerable_hotspots": [
            "Silk Board Junction & Central Silk Board flyover under-deck",
            "Outer Ring Road (ORR) stretch: Bellandur, EcoSpace, Devarabeesanahalli & Marathahalli",
            "Benniganahalli Railway Underbridge (Tin Factory / Old Madras Road)",
            "Puttenahalli & Okalipuram Railway Underpasses",
            "Hebbal Flyover service roads & Manyata Tech Park junction (Nagawara)",
            "Koramangala (80 Feet Road, 4th Block & Ejipura Inner Ring Road)",
            "Varthur Road & Sarjapur Road low-lying dips near Carmelaram",
            "South End Circle & Lalbagh West Gate dips"
        ],
        "safe_alternatives": [
            "Use Namma Metro (Purple/Green Lines) to bypass flooded surface corridors",
            "Use elevated flyovers (BETL Hosur Road Elevated, Airport Elevated) avoiding service road dips"
        ],
        "underpasses_to_avoid": [
            "Okalipuram Underpass", "Puttenahalli Underpass", "Kengeri Underpass", "Lingarajapuram Underpass"
        ]
    },
    "bangalore": {
        "city_name": "Bengaluru",
        "authority": "BBMP & Bengaluru Traffic Police (BTP)",
        "vulnerable_hotspots": [
            "Silk Board Junction & Central Silk Board flyover under-deck",
            "Outer Ring Road (ORR) stretch: Bellandur, EcoSpace, Devarabeesanahalli & Marathahalli",
            "Benniganahalli Railway Underbridge (Tin Factory / Old Madras Road)",
            "Puttenahalli & Okalipuram Railway Underpasses",
            "Hebbal Flyover service roads & Manyata Tech Park junction (Nagawara)",
            "Koramangala (80 Feet Road, 4th Block & Ejipura Inner Ring Road)",
            "Varthur Road & Sarjapur Road low-lying dips near Carmelaram"
        ],
        "safe_alternatives": [
            "Use Namma Metro (Purple/Green Lines) to bypass flooded surface corridors",
            "Use elevated flyovers (BETL Hosur Road Elevated, Airport Elevated) avoiding service road dips"
        ],
        "underpasses_to_avoid": [
            "Okalipuram Underpass", "Puttenahalli Underpass", "Kengeri Underpass", "Lingarajapuram Underpass"
        ]
    },
    "mumbai": {
        "city_name": "Mumbai",
        "authority": "Brihanmumbai Municipal Corporation (BMC)",
        "vulnerable_hotspots": [
            "Hindmata (Dadar / Parel) & Gandhi Market (King's Circle / Matunga)",
            "Subways: Milan Subway (Santacruz), Andheri Subway, Khar Subway & Malad Subway",
            "Sion Circle, Chunabhatti & Kurla (Kamani junction / LBS Marg)",
            "Postal Colony & Shell Colony (Chembur)",
            "JVLR low-lying dips near SEEPZ & Sakinaka junction",
            "Dahisar Toll Naka & SV Road near Bandra Talao"
        ],
        "safe_alternatives": [
            "Use Mumbai Metro Lines 2A, 7, and 1 to bypass flooded subways",
            "Use Eastern Freeway or Coastal Road / Western Express Highway elevated stretches"
        ],
        "underpasses_to_avoid": [
            "Milan Subway", "Andheri Subway", "Khar Subway", "Malad Subway"
        ]
    },
    "delhi": {
        "city_name": "Delhi / NCR",
        "authority": "PWD Delhi & Delhi Traffic Police",
        "vulnerable_hotspots": [
            "Minto Bridge Railway Underpass (Strictly barricaded during heavy downpours)",
            "Pul Prahladpur Underpass (MB Road) & Zakhira Underpass",
            "ITO intersection & Ring Road near WHO building / IP Flyover",
            "Dhaula Kuan Underpass towards Gurugram & Mahipalpur underpass",
            "Pragati Maidan Tunnel approaches & Bhairon Marg",
            "South Extension Ring Road dips & AIIMS flyover loops",
            "Gurugram Stretch: Subhash Chowk, Hero Honda Chowk, Narsinghpur (NH-48), Golf Course Extn"
        ],
        "safe_alternatives": [
            "Use Delhi Metro (Yellow, Blue, Magenta lines) for seamless inter-city transit",
            "Use elevated Barapullah Corridor instead of surface Ring Road dips"
        ],
        "underpasses_to_avoid": [
            "Minto Road Underpass", "Pul Prahladpur Underpass", "Zakhira Underpass", "Azadpur Underpass"
        ]
    },
    "chennai": {
        "city_name": "Chennai",
        "authority": "Greater Chennai Corporation (GCC) & Chennai Traffic Police",
        "vulnerable_hotspots": [
            "Velachery (100 Feet Road, Baby Nagar, Tansi Nagar & Vijaya Nagar junction)",
            "Madipakkam, Pallikaranai marshland fringes & Perumbakkam",
            "Subways: Vyasarpadi Ganesapuram subway, Thillai Ganga Nagar subway & Madley subway (T. Nagar)",
            "GST Road near Chromepet & Tambaram low-lying dips",
            "Perambur Barracks Road & Kolathur (Retteri junction)"
        ],
        "safe_alternatives": [
            "Use Chennai Metro (Blue & Green lines) or MRTS elevated corridors",
            "Use Chennai Outer Ring Road (CORR) avoiding low-lying interior bypasses"
        ],
        "underpasses_to_avoid": [
            "Vyasarpadi Subway", "Thillai Ganga Nagar Subway", "Madley Subway", "Rangarajapuram Subway"
        ]
    },
    "hyderabad": {
        "city_name": "Hyderabad",
        "authority": "GHMC & Hyderabad City Police",
        "vulnerable_hotspots": [
            "Malakpet Railway Bridge & Moosarambagh Causeway (Musi river surge)",
            "Tolichowki (Shaikpet flyover slip road & Paramount Colony)",
            "Begumpet Under Bridge near railway station & Rasoolpura junction",
            "Hitec City: Cyber Towers junction dip, Biodiversity park junction lower slips",
            "Alwal, Quthbullapur & Nizampet low-lying road networks",
            "Khairatabad Flyover entry slips & Lakdikapul dips"
        ],
        "safe_alternatives": [
            "Use Hyderabad Metro (Red, Blue, Green lines)",
            "Use PVNR Elevated Expressway towards Shamshabad Airport"
        ],
        "underpasses_to_avoid": [
            "Malakpet Underbridge", "Begumpet Underbridge", "Balanagar Underbridge"
        ]
    },
    "kolkata": {
        "city_name": "Kolkata",
        "authority": "Kolkata Municipal Corporation (KMC)",
        "vulnerable_hotspots": [
            "Central Avenue (CR Avenue), Thanthania & College Street",
            "Amherst Street, MG Road & Muktaram Babu Street",
            "Ultadanga Railway Underpass & Kankurgachi underbridge",
            "Behala (Diamond Harbour Road dips near Behala Chowrasta)",
            "Park Circus 7-point crossing & Camac Street dips"
        ],
        "safe_alternatives": [
            "Use Kolkata Metro (North-South & East-West lines)",
            "Use Maa Flyover / AJC Bose Road Flyover avoiding surface inundation"
        ],
        "underpasses_to_avoid": [
            "Ultadanga Underpass", "Kankurgachi Railway Underbridge", "Lake Gardens Underpass"
        ]
    },
    "pune": {
        "city_name": "Pune",
        "authority": "Pune Municipal Corporation (PMC)",
        "vulnerable_hotspots": [
            "Shivajinagar Railway Underpass & Sancheti hospital subway",
            "Alka Talkies Chowk & Deccan Gymkhana riverside road",
            "Sinhagad Road low-lying points near Mutha river canal",
            "Yerwada Gunjan Chowk & Nagar Road underpasses"
        ],
        "safe_alternatives": [
            "Use Pune Metro lines or elevated bypasses",
            "Avoid riverside roads (Riverside DP Road) during dam discharge or heavy showers"
        ],
        "underpasses_to_avoid": [
            "Shivajinagar Underpass", "Chhatrapati Shivaji Maharaj Underpass"
        ]
    }
}


def get_urban_flood_advisory(location_name: str, rainfall_mm: float = 0.0, condition: str = "") -> Optional[Dict[str, Any]]:
    """
    Look up urban waterlogging and commute vulnerability data for a location.
    Matches city names within location strings (e.g. 'Bengaluru, Karnataka' or 'South Delhi').
    """
    norm = location_name.lower().strip()
    matched_entry = None

    for city_key, data in URBAN_VULNERABILITY_REGISTRY.items():
        if city_key in norm:
            matched_entry = data
            break

    if not matched_entry:
        return None

    # Determine risk posture
    is_rainy = rainfall_mm > 2.0 or any(w in condition.lower() for w in ["rain", "storm", "shower", "thunder", "drizzle"])
    
    risk_level = "Elevated Inundation Risk" if (rainfall_mm > 15.0) else ("Moderate Waterlogging Caution" if is_rainy else "Low / Normal Conditions")
    
    return {
        "city": matched_entry["city_name"],
        "authority": matched_entry["authority"],
        "risk_level": risk_level,
        "hotspots": matched_entry["vulnerable_hotspots"],
        "safe_alternatives": matched_entry["safe_alternatives"],
        "underpasses_to_avoid": matched_entry["underpasses_to_avoid"],
        "commute_guidelines": [
            "Never drive or wade into flooded underpasses where depth cannot be gauged.",
            "Two-wheeler riders should beware of invisible open drains, water-covered potholes, and aquaplaning.",
            "If water levels reach the bottom of wheel rims, stop and avoid restarting stalled engines in deep water.",
            "Prioritize elevated flyovers or metro transit over surface bottleneck routes."
        ]
    }
