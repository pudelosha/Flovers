import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import SettingsCard from "../SettingsCard";

describe("SettingsCard", () => {
  const props = {
    language: "en" as const,
    setLanguage: jest.fn(),
    langOpen: false,
    setLangOpen: jest.fn(),
    dateFormat: "DD.MM.YYYY",
    setDateFormat: jest.fn(),
    dateOpen: false,
    setDateOpen: jest.fn(),
    temperatureUnit: "C" as const,
    setTemperatureUnit: jest.fn(),
    tempOpen: false,
    setTempOpen: jest.fn(),
    measureUnit: "metric" as const,
    setMeasureUnit: jest.fn(),
    measureOpen: false,
    setMeasureOpen: jest.fn(),
    tileTransparency: 0.12,
    setTileTransparency: jest.fn(),
    background: "bg1" as const,
    setBackground: jest.fn(),
    bgOpen: false,
    setBgOpen: jest.fn(),
    tileMotive: "light" as const,
    setTileMotive: jest.fn(),
    tileMotiveOpen: false,
    setTileMotiveOpen: jest.fn(),
    fabPosition: "right" as const,
    setFabPosition: jest.fn(),
    fabOpen: false,
    setFabOpen: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens dropdowns and saves settings", () => {
    const { getByText } = render(<SettingsCard {...props} />);

    fireEvent.press(getByText(/English/));
    fireEvent.press(getByText("DD.MM.YYYY"));
    fireEvent.press(getByText("profile.settings.temperatureOptions.C"));
    fireEvent.press(getByText("profile.settings.measureOptions.metric"));
    fireEvent.press(getByText("profile.settings.fabPositionOptions.right"));
    fireEvent.press(getByText("profile.settings.backgroundOptions.bg1"));
    fireEvent.press(getByText("profile.common.save"));

    expect(props.setLangOpen).toHaveBeenCalled();
    expect(props.setDateOpen).toHaveBeenCalled();
    expect(props.setTempOpen).toHaveBeenCalled();
    expect(props.setMeasureOpen).toHaveBeenCalled();
    expect(props.setFabOpen).toHaveBeenCalled();
    expect(props.setBgOpen).toHaveBeenCalled();
    expect(props.onSave).toHaveBeenCalledTimes(1);
  });

  it("selects an opened language option", () => {
    const { getByText } = render(
      <SettingsCard {...props} langOpen />
    );

    fireEvent.press(getByText(/Polski/));

    expect(props.setLanguage).toHaveBeenCalledWith("pl");
    expect(props.setLangOpen).toHaveBeenCalledWith(false);
  });
});
