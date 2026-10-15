import { navigationRef, navTo, flushPendingNavigation, clearPendingNavigation } from "../navigationRef";

jest.mock("@react-navigation/native", () => ({
  createNavigationContainerRef: () => ({ isReady: jest.fn(), navigate: jest.fn() }),
}));

describe("notification navigation during startup", () => {
  beforeEach(() => { clearPendingNavigation(); jest.clearAllMocks(); });
  it("opens the notification destination when the navigation container becomes ready", () => {
    (navigationRef.isReady as jest.Mock).mockReturnValue(false);
    navTo("Readings", { id: "7" });
    expect(navigationRef.navigate).not.toHaveBeenCalled();
    (navigationRef.isReady as jest.Mock).mockReturnValue(true);
    flushPendingNavigation();
    expect(navigationRef.navigate).toHaveBeenCalledWith("Readings", { id: "7" });
    flushPendingNavigation();
    expect(navigationRef.navigate).toHaveBeenCalledTimes(1);
  });
  it("drops a pending notification when the account session stops", () => {
    (navigationRef.isReady as jest.Mock).mockReturnValue(false);
    navTo("Readings");
    clearPendingNavigation();
    (navigationRef.isReady as jest.Mock).mockReturnValue(true);
    flushPendingNavigation();
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });
});
