import os
import pyttsx3

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "sample-audio")
os.makedirs(SAMPLE_DIR, exist_ok=True)

SAMPLE_TEXT = (
    "Hi, this is Sarah Jenkins calling from Apex Global. "
    "I wanted to follow up on our discussion regarding the Wavelength Enterprise CRM platform. "
    "We are looking to deploy this for our sales team of 25 representatives. "
    "Overall, we are very excited about the real-time call transcription and automated sentiment tracking features. "
    "However, I do have a concern regarding our data migration timeline from Salesforce "
    "and whether your team can assist with data import before the end of the month. "
    "Could you send over a detailed pricing proposal and schedule a technical demonstration "
    "with our IT director for next Tuesday at 10 AM? "
    "If the pricing looks good and migration support is included, we are ready to move forward to contract negotiation."
)

def generate_sample_wav(filename: str = "sample.wav"):
    output_path = os.path.join(SAMPLE_DIR, filename)
    engine = pyttsx3.init()
    engine.setProperty('rate', 160)
    engine.save_to_file(SAMPLE_TEXT, output_path)
    engine.runAndWait()
    print(f"Generated sample audio file at: {output_path}")
    return output_path

if __name__ == "__main__":
    generate_sample_wav("sample.wav")
    generate_sample_wav("crm_sales_call.wav")
