import os
import sys
from datetime import datetime, timezone
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Try to load environment variables from a local .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    print("❌ Error: MONGODB_URI environment variable is not set.")
    print("Please set it in your .env file or export it in your terminal.")
    sys.exit(1)

def seed_database():
    try:
        # Establish connection to the MongoDB cluster
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.server_info() # Validate connection
        
        # Define database name (matches the backend / mcp settings)
        db = client["spatial_optician_db"]
        
        print("⚡ Connected to MongoDB Atlas successfully.")
        print("🧹 Cleaning up old tracking data...")
        db["equipment_catalog"].drop()
        db["audit_history"].drop()
        db["energy_tariffs"].drop()

        # 1. Seeding equipment catalog (equipment_catalog)
        print("📦 Seeding 'equipment_catalog'...")
        fixtures = [
            {
                "model_id": "OPT-IND-LED-200",
                "brand": "LuminaPro Industrial",
                "type": "High-Bay LED",
                "luminous_flux_lumens": 28000,
                "power_watts": 200,
                "efficacy_lm_w": 140,
                "beam_angle_degrees": 90,
                "mounting_type": "Pendant/Suspended",
                "unit_cost_usd": 185.00,
                "lifespan_hours": 60000,
                "suitable_for": ["warehouse", "factory", "heavy_industry"]
            },
            {
                "model_id": "OPT-COM-PANEL-040",
                "brand": "EcoLux Systems",
                "type": "LED Panel / Troffer",
                "luminous_flux_lumens": 4800,
                "power_watts": 40,
                "efficacy_lm_w": 120,
                "beam_angle_degrees": 120,
                "mounting_type": "Recessed/Grid",
                "unit_cost_usd": 45.50,
                "lifespan_hours": 50000,
                "suitable_for": ["office", "retail", "mall_corridor"]
            },
            {
                "model_id": "OPT-IND-LOW-120",
                "brand": "LuminaPro Industrial",
                "type": "Low-Bay LED Linear",
                "luminous_flux_lumens": 16200,
                "power_watts": 120,
                "efficacy_lm_w": 135,
                "beam_angle_degrees": 120,
                "mounting_type": "Surface/Chain",
                "unit_cost_usd": 125.00,
                "lifespan_hours": 60000,
                "suitable_for": ["warehouse_aisles", "loading_docks", "workshop"]
            }
        ]
        db["equipment_catalog"].insert_many(fixtures)

        # 2. Seeding audit logs (audit_history)
        print("📊 Seeding 'audit_history'...")
        audits = [
            {
                "audit_id": "AUD-2026-NY01",
                "site_reference": "NY-HUD-01",
                "facility_type": "warehouse",
                "total_area_sqm": 2500,
                "ceiling_height_meters": 12.0,
                "measured_average_lux": 80,
                "target_required_lux": 200,
                "lux_deficit": -120,
                "current_lighting_type": "Legacy HID (Mercury/HPS)",
                "current_estimated_power_kw": 45.0,
                "recommended_fixture_id": "OPT-IND-LED-200",
                "recommended_quantity": 48,
                "status": "Needs Upgrade",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "audit_id": "AUD-2026-CH02",
                "site_reference": "CH-DIST-04",
                "facility_type": "retail",
                "total_area_sqm": 1200,
                "ceiling_height_meters": 4.5,
                "measured_average_lux": 410,
                "target_required_lux": 400,
                "lux_deficit": 10,
                "current_lighting_type": "EcoLux Systems Panel V1",
                "current_estimated_power_kw": 14.4,
                "recommended_fixture_id": None,
                "recommended_quantity": 0,
                "status": "Optimized",
                "created_at": datetime.now(timezone.utc)
            }
        ]
        db["audit_history"].insert_many(audits)

        # 3. Seeding power rates and co2 conversion factors (energy_tariffs)
        print("💡 Seeding 'energy_tariffs'...")
        tariffs = [
            {
                "region_code": "US-NY",
                "currency": "USD",
                "kwh_rate": 0.21,
                "commercial_co2_factor_kg_kwh": 0.42,
                "last_updated": datetime.now(timezone.utc)
            },
            {
                "region_code": "US-IL",
                "currency": "USD",
                "kwh_rate": 0.14,
                "commercial_co2_factor_kg_kwh": 0.38,
                "last_updated": datetime.now(timezone.utc)
            }
        ]
        db["energy_tariffs"].insert_many(tariffs)

        print("\n🎉 Database successfully populated with Spatial Optician mock data!")
        
    except ConnectionFailure:
        print("❌ Error: Could not connect to MongoDB Atlas. Check your MONGODB_URI or IP Whitelist.")
    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    seed_database()
