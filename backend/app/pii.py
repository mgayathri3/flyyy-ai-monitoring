from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine


analyzer = AnalyzerEngine()
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