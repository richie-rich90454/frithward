"""Runnable typed example for the Frithward Python SDK.

Start the API locally first:

    pnpm run start:api

Then run this file:

    uv run --project packages/sdk-python python packages/sdk-python/examples/typed_example.py

Set FRITHWARD_URL to target a non-default API address.
"""

import os

from frithward_sdk import FrithwardClient, FrithwardError


def main() -> None:
    client = FrithwardClient(base_url=os.environ.get("FRITHWARD_URL", "http://localhost:3000"))
    try:
        print("health:", client.health())
        print("session:", client.get_session())
        print("analysis:", client.analyze_text("Your parcel is waiting. Pay the fee at this link."))
    except FrithwardError as exc:
        print(f"request failed: {exc.status} {exc.code}: {exc}")
    finally:
        client.close()


if __name__ == "__main__":
    main()
