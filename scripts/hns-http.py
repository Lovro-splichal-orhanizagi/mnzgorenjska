"""One bounded public HNS GET. stdout is a JSON response envelope, never logs."""
import base64
import json
import re
import sys


def main():
    if len(sys.argv) != 2 or not re.fullmatch(
        r"https://semafor\.hns\.family/(?:natjecanja|utakmice)/[0-9]+/x/", sys.argv[1]
    ):
        raise ValueError("Only canonical public HNS competition/report URLs are allowed")
    from curl_cffi import requests

    # Keep Chrome's matching headers and connection profile. No personal browser
    # cookies, redirects, proxy environment, session persistence or retries.
    response = requests.get(sys.argv[1], impersonate="chrome", timeout=25,
                            allow_redirects=False, trust_env=False)
    if len(response.content) > 8 * 1024 * 1024:
        raise ValueError("HNS response exceeds 8 MiB")
    headers = {k: v for k, v in response.headers.items()
               if k.lower() in ("content-type", "cf-mitigated", "retry-after")}
    print(json.dumps({"status": response.status_code, "headers": headers,
                      "body": base64.b64encode(response.content).decode("ascii")}))


if __name__ == "__main__":
    main()
