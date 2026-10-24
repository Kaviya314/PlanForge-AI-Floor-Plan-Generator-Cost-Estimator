from app.models.schemas import PlanLayoutSchema, PlotSchema, RoomSchema
from app.services.cost_service import calculate_cost_estimate_py

def test_cost_calculation_math_and_totals():
    layout = PlanLayoutSchema(
        project_name="Cost Test 2BHK",
        plot=PlotSchema(width=30, length=40, unit="ft"),
        rooms=[
            RoomSchema(id="r1", name="Living", type="living", x=2, y=2, width=15, length=20), # 300 sqft
            RoomSchema(id="r2", name="Bedroom", type="bedroom", x=18, y=2, width=10, length=20), # 200 sqft
        ],
        floors=1,
        budget_inr=1500000
    )
    # Total carpet = 500 sqft. Built-up area = 500 * 1.18 = 590 sqft
    result = calculate_cost_estimate_py(layout)

    assert result.carpet_area_sqft == 500
    assert result.built_up_area_sqft == 590
    assert result.grand_total > 0

    # Test multiplication: for each item, subtotal must equal qty * unit_rate
    for item in result.items:
        assert item.subtotal == round(item.quantity * item.unit_rate)

    # Test no double counting: Grand total = material + labour + finishing/services + contingency
    expected_sum = (
        result.material_cost_total +
        result.labour_cost_total +
        result.finishing_services_total +
        result.contingency_total
    )
    assert abs(result.grand_total - expected_sum) <= 1

    # Budget variance
    assert result.budget_variance == (1500000 - result.grand_total)

def test_unit_rate_override():
    layout = PlanLayoutSchema(
        project_name="Override Test",
        plot=PlotSchema(width=30, length=40, unit="ft"),
        rooms=[
            RoomSchema(id="r1", name="Room", type="living", x=2, y=2, width=10, length=10)
        ],
        floors=1,
        budget_inr=1000000
    )
    # Override cement price from 380 to 500
    res_default = calculate_cost_estimate_py(layout)
    res_override = calculate_cost_estimate_py(layout, rate_overrides={"cement": 500.0})

    cement_default = next(i for i in res_default.items if i.id == "cement")
    cement_override = next(i for i in res_override.items if i.id == "cement")

    assert cement_default.unit_rate == 380.0
    assert cement_override.unit_rate == 500.0
    assert cement_override.status == "user_modified"
    assert res_override.grand_total > res_default.grand_total
