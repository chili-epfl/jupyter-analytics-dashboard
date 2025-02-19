
async def test_get_example(jp_fetch):
    # When
    response = await jp_fetch("jupyterlab-unianalytics-dashboard", "get_user_id")

    # Then
    assert response.code == 200
