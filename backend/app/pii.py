from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine


# Configure Presidio to use the lightweight spaCy English model
configuration = {
    "nlp_engine_name": "spacy",
    "models": [
        {
            "lang_code": "en",
            "model_name": "en_core_web_sm"
        }
    ]
}

# Create the NLP engine
provider = NlpEngineProvider(
    nlp_configuration=configuration
)

nlp_engine = provider.create_engine()

# Create Presidio analyzer using the lightweight model
analyzer = AnalyzerEngine(
    nlp_engine=nlp_engine,
    supported_languages=["en"]
)

# Create anonymizer
anonymizer = AnonymizerEngine()


def sanitize_prompt(prompt: str):
    results = analyzer.analyze(
        text=prompt,
        entities=[
            "PERSON",
            "PHONE_NUMBER",
            "EMAIL_ADDRESS",
            "CREDIT_CARD",
            "IP_ADDRESS",
        ],
        language="en",
    )

    anonymized = anonymizer.anonymize(
        text=prompt,
        analyzer_results=results,
    )

    pii_counts = {}

    for result in results:
        entity = result.entity_type
        pii_counts[entity] = pii_counts.get(entity, 0) + 1

    return {
        "sanitized_prompt": anonymized.text,
        "pii_counts": pii_counts,
    }