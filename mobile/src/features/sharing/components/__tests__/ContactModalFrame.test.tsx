import React from "react";
import { BackHandler, Keyboard, Pressable, ScrollView, Text, TextInput } from "react-native";
import { act, fireEvent, render, within } from "@testing-library/react-native";
import ContactModalFrame from "../ContactModalFrame";

it.each([false, true])("absorbs a blank panel press without dismissing while keeping child controls usable (fullScreen=%s)", (fullScreen) => {
  const close = jest.fn(), save = jest.fn(), change = jest.fn(), stopPropagation = jest.fn();
  const view = render(<ContactModalFrame visible title="Journal photo" onClose={close} sharingLayout fullScreen={fullScreen}>
    <Text>Optional notes</Text>
    <TextInput accessibilityLabel="Notes" onChangeText={change} />
    <Pressable onPress={save}><Text>Save photo</Text></Pressable>
  </ContactModalFrame>);
  // The glass must follow the panel rather than covering its outer margins.
  expect(within(view.getByTestId("contact-modal-content")).getByTestId("contact-modal-glass")).toBeTruthy();
  fireEvent.press(view.getByTestId("contact-modal-content"), { stopPropagation });
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  fireEvent.changeText(view.getByLabelText("Notes"), "A new leaf");
  fireEvent.press(view.getByText("Save photo"));
  expect(change).toHaveBeenCalledWith("A new leaf");
  expect(save).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
});

it("keeps outside backdrop and close button as explicit dismissal targets", () => {
  const close = jest.fn();
  const dismissKeyboard = jest.spyOn(Keyboard, "dismiss");
  const view = render(<ContactModalFrame visible title="Journal photo" onClose={close}><Text>Photo</Text></ContactModalFrame>);
  fireEvent.press(view.getByTestId("contact-modal-backdrop"));
  expect(close).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getAllByRole("button", { name: "Close" })[1]);
  expect(close).toHaveBeenCalledTimes(2);
  expect(dismissKeyboard).toHaveBeenCalledTimes(2);
  dismissKeyboard.mockRestore();
});

it("preserves hardware-back dismissal and removes the subscription on close", () => {
  let handler: (() => boolean) | undefined;
  const remove = jest.fn();
  const add = jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, listener) => {
    handler = listener as () => boolean;
    return { remove };
  });
  const close = jest.fn();
  const view = render(<ContactModalFrame visible title="Journal photo" onClose={close}><Text>Photo</Text></ContactModalFrame>);
  act(() => { expect(handler?.()).toBe(true); });
  expect(close).toHaveBeenCalledTimes(1);
  view.rerender(<ContactModalFrame visible={false} title="Journal photo" onClose={close}><Text>Photo</Text></ContactModalFrame>);
  expect(remove).toHaveBeenCalledTimes(1);
  add.mockRestore();
});

it("lets the photo editor pause outer scrolling without changing panel dismissal behavior", () => {
  const close = jest.fn();
  const view = render(<ContactModalFrame visible title="Journal photo" onClose={close} sharingLayout scrollEnabled={false}>
    <Text>Framing editor</Text>
  </ContactModalFrame>);
  expect(view.UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(false);
  fireEvent.press(view.getByTestId("contact-modal-content"), { stopPropagation: jest.fn() });
  expect(close).not.toHaveBeenCalled();
});
