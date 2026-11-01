import React from "react";
import {act,fireEvent,render} from "@testing-library/react-native";
import SearchPlantsModal from "../SearchPlantsModal";
it("applies a trimmed draft without changing results while typing",()=>{
 const apply=jest.fn(),cancel=jest.fn();const view=render(<SearchPlantsModal visible query="Fern" onApply={apply} onCancel={cancel}/>);
 fireEvent.changeText(view.getByLabelText("Name, species or location"),"  Bird living  ");expect(apply).not.toHaveBeenCalled();
 fireEvent.press(view.getByText("Search"));expect(apply).toHaveBeenCalledWith("Bird living");
});
it("cancels drafts and restores the applied query when reopened",()=>{
 const apply=jest.fn(),cancel=jest.fn();const props={query:"Fern",onApply:apply,onCancel:cancel};const view=render(<SearchPlantsModal {...props} visible/>);
 fireEvent.changeText(view.getByLabelText("Name, species or location"),"Other");fireEvent.press(view.getByText("Cancel"));
 expect(cancel).toHaveBeenCalledTimes(1);expect(apply).not.toHaveBeenCalled();
 view.rerender(<SearchPlantsModal {...props} visible={false}/>);view.rerender(<SearchPlantsModal {...props} visible/>);
 expect(view.getByLabelText("Name, species or location").props.value).toBe("Fern");
});
it("clears an applied search and supports keyboard submission",()=>{
 const apply=jest.fn();const view=render(<SearchPlantsModal visible query="Fern" onApply={apply} onCancel={jest.fn()}/>);
 fireEvent.press(view.getByText("Clear search"));expect(apply).toHaveBeenCalledWith("");
 fireEvent.changeText(view.getByLabelText("Name, species or location"),"Kitchen");fireEvent(view.getByLabelText("Name, species or location"),"submitEditing");
 expect(apply).toHaveBeenLastCalledWith("Kitchen");
});
