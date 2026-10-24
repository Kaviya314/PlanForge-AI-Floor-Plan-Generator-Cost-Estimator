from app.models.schemas import PlanLayoutSchema, PlotSchema, RoomSchema
from app.services.validation_service import validate_layout_py

def test_valid_layout():
    layout = PlanLayoutSchema(
        project_name="Valid 2BHK",
        plot=PlotSchema(width=30, length=40, unit="ft"),
        rooms=[
            RoomSchema(id="r1", name="Living", type="living", x=2, y=2, width=13, length=15),
            RoomSchema(id="r2", name="Bedroom", type="bedroom", x=16, y=2, width=12, length=15),
            RoomSchema(id="r3", name="Kitchen", type="kitchen", x=2, y=18, width=13, length=18),
            RoomSchema(id="r4", name="Bath", type="bathroom", x=16, y=18, width=12, length=18),
        ],
        floors=1,
        budget_inr=2000000
    )
    result = validate_layout_py(layout)
    assert result.is_valid is True
    assert len(result.errors) == 0
    assert result.checks.no_room_overlap is True
    assert result.checks.within_plot_boundary is True

def test_out_of_bounds_detection():
    layout = PlanLayoutSchema(
        project_name="OOB Test",
        plot=PlotSchema(width=30, length=40, unit="ft"),
        rooms=[
            # Extends beyond width 30 (x=25, width=10 => right=35)
            RoomSchema(id="r1", name="OOB Room", type="bedroom", x=25, y=5, width=10, length=12)
        ]
    )
    result = validate_layout_py(layout)
    assert result.is_valid is False
    assert result.checks.within_plot_boundary is False
    assert any("extends beyond plot limits" in err.message for err in result.errors)

def test_overlapping_rooms_detection():
    layout = PlanLayoutSchema(
        project_name="Overlap Test",
        plot=PlotSchema(width=30, length=40, unit="ft"),
        rooms=[
            RoomSchema(id="r1", name="Room A", type="living", x=5, y=5, width=12, length=12),
            # Intersects Room A
            RoomSchema(id="r2", name="Room B", type="bedroom", x=10, y=10, width=12, length=12)
        ]
    )
    result = validate_layout_py(layout)
    assert result.is_valid is False
    assert result.checks.no_room_overlap is False
    assert any("Spatial collision" in err.message for err in result.errors)

def test_negative_room_dimensions():
    layout = PlanLayoutSchema(
        project_name="Negative Dimensions Test",
        plot=PlotSchema(width=30, length=40, unit="ft"),
        rooms=[
            # Note: Pydantic gt=0 validates on schema, but if bypassed:
            RoomSchema.model_construct(id="r1", name="Bad Room", type="living", x=2, y=2, width=-5, length=10)
        ]
    )
    result = validate_layout_py(layout)
    assert result.is_valid is False
    assert result.checks.dimensions_positive is False
