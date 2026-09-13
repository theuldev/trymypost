import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            'http://127.0.0.1:8000/api/v1/code/from-post',
            json={'post': 'Here is a Python example:\n```python\nprint("Hello World")\n```'}
        )
        print(f'Status: {response.status_code}')
        print(f'Response: {response.text}')

asyncio.run(test())