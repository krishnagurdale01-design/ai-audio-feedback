import os
import json
from openai import AsyncOpenAI
import schemas

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "dummy"))

async def generate_quotation_estimate(quote_data: schemas.QuotationCreate):
    prompt = f"""
    You are an expert media production estimator. Calculate a rough quotation estimate based on these requirements:
    Project Type: {quote_data.project_type}
    Video Length: {quote_data.video_length}
    VFX Complexity: {quote_data.vfx_complexity}
    Dubbing Languages: {', '.join(quote_data.dubbing_languages)}
    Deadline: {quote_data.deadline}
    Additional Services: {', '.join(quote_data.additional_services)}
    Description: {quote_data.project_description}

    Return a JSON object with this exact structure, nothing else:
    {{
        "estimated_cost_min": 10000,
        "estimated_cost_max": 25000,
        "estimated_timeline": "10-15 Days",
        "cost_breakdown": {{
            "Production": 8000,
            "VFX": 2000,
            "Other": 0
        }},
        "ai_notes": "Explanation of the costs."
    }}
    Assume currency is INR (₹). Make it realistic for the Indian market.
    """

    try:
        if os.getenv("OPENAI_API_KEY", "dummy") == "dummy":
            # Return mock data if no API key is present, to allow local testing
            return {
                "estimated_cost_min": 50000,
                "estimated_cost_max": 100000,
                "estimated_timeline": "15-20 Days",
                "cost_breakdown": {
                    "Production": 40000,
                    "VFX": 10000,
                    "Dubbing": 20000,
                    "Urgent Delivery": 0
                },
                "ai_notes": "This is a mock estimate because OPENAI_API_KEY is not set."
            }

        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that only outputs valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        return {
            "estimated_cost_min": 0,
            "estimated_cost_max": 0,
            "estimated_timeline": "TBD",
            "cost_breakdown": {},
            "ai_notes": "Error generating estimate. Our team will review manually."
        }
