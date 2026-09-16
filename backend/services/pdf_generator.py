"""WeatherGPT v2.0 — PDF Advisory Report Generator (FPDF2)"""
from datetime import datetime


def generate_weather_pdf(location: str, weather_data: dict, advisory_text: str) -> bytes:
    from fpdf import FPDF

    class PDF(FPDF):
        def header(self):
            self.set_font("Helvetica", "B", 16)
            self.set_text_color(30, 90, 180)
            self.cell(0, 10, "WeatherGPT Advisory Report", align="C", new_x="LMARGIN", new_y="NEXT")
            self.set_font("Helvetica", "", 10)
            self.set_text_color(100, 100, 100)
            self.cell(0, 6, f"SIH26068 | Team Frame Fusion | {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", align="C", new_x="LMARGIN", new_y="NEXT")
            self.ln(4)

        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 10, "Source: Open-Meteo (IMD-aligned) | Data grounded in retrieved meteorological records", align="C")

    pdf = PDF()
    pdf.add_page()
    current = weather_data.get("current_weather", {})
    loc_info = weather_data.get("location_info", {})

    # Location header
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 10, f"Location: {location}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 6, f"Lat: {loc_info.get('latitude','N/A')} | Lon: {loc_info.get('longitude','N/A')} | State: {loc_info.get('admin1','N/A')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Metrics grid
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 90, 180)
    pdf.cell(0, 8, "Current Conditions", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(20, 20, 20)
    metrics = [
        ("Temperature", f"{current.get('temperature','N/A')}°C"),
        ("Feels Like", f"{current.get('feels_like','N/A')}°C"),
        ("Humidity", f"{current.get('humidity','N/A')}%"),
        ("Wind Speed", f"{current.get('wind_speed','N/A')} km/h"),
        ("Condition", current.get("condition", "N/A")),
        ("UV Index", f"{current.get('uv_index','N/A')} ({current.get('uv_category','N/A')})"),
    ]
    for label, value in metrics:
        pdf.cell(60, 7, label + ":", border="B")
        pdf.cell(0, 7, value, border="B", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Advisory text
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 90, 180)
    pdf.cell(0, 8, "AI Advisory (Evidence-Grounded)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(20, 20, 20)
    # Clean markdown for PDF
    import re
    clean = re.sub(r"[*#_`]", "", advisory_text)
    pdf.multi_cell(0, 6, clean[:2000])

    # 7-day forecast table
    daily = weather_data.get("daily_forecast", [])
    if daily:
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(30, 90, 180)
        pdf.cell(0, 8, "7-Day Forecast", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(20, 20, 20)
        pdf.cell(40, 7, "Date", border=1)
        pdf.cell(30, 7, "Max °C", border=1)
        pdf.cell(30, 7, "Min °C", border=1)
        pdf.cell(40, 7, "Rain mm", border=1)
        pdf.cell(0, 7, "Condition", border=1, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        for d in daily[:7]:
            pdf.cell(40, 6, str(d.get("date", "N/A")), border=1)
            pdf.cell(30, 6, str(d.get("temp_max", "N/A")), border=1)
            pdf.cell(30, 6, str(d.get("temp_min", "N/A")), border=1)
            pdf.cell(40, 6, str(d.get("precipitation_sum", 0)), border=1)
            pdf.cell(0, 6, str(d.get("condition", "N/A"))[:30], border=1, new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())
