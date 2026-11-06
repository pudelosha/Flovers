import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import Step05 from '../Step05_ContainerAndSoil';

let mockInitial: any;
const mockMaterial=jest.fn();
const mockSoil=jest.fn();
jest.mock('react-i18next',()=>({useTranslation:()=>({t:(key:string)=>key})}));
jest.mock('../../../../app/providers/LanguageProvider',()=>({useLanguage:()=>({currentLanguage:'en'})}));
jest.mock('../../hooks/useCreatePlantWizard',()=>({useCreatePlantWizard:()=>{
 const [state,setState]=require('react').useState(mockInitial);
 return {state,actions:{
  setPotMaterial:(value:any)=>{mockMaterial(value);setState((s:any)=>({...s,potMaterial:value}));},
  setSoilMix:(value:any)=>{mockSoil(value);setState((s:any)=>({...s,soilMix:value}));},
 }};
}}));
beforeEach(()=>{
 jest.clearAllMocks();
 mockInitial={selectedPlantDefinition:{recommended_pot_materials:['terracotta'],recommended_soil_mixes:['all-purpose']}};
});
it('defaults both optional fields to Not specified despite single definition recommendations',()=>{
 const ui=render(<Step05/>);
 expect(ui.getAllByText('Not specified')).toHaveLength(2);
 expect(mockMaterial).not.toHaveBeenCalled();
 expect(mockSoil).not.toHaveBeenCalled();
});
it('lets the user clear a selected container and keeps it unspecified',()=>{
 mockInitial.potMaterial='terracotta';
 const ui=render(<Step05/>);
 fireEvent.press(ui.getByText('terracotta'));
 fireEvent.press(ui.getAllByText('Not specified')[0]);
 expect(mockMaterial).toHaveBeenCalledTimes(1);
 expect(mockMaterial).toHaveBeenLastCalledWith(undefined);
 expect(ui.getAllByText('Not specified')).toHaveLength(2);
});
it('lets the user clear a selected soil and keeps it unspecified',()=>{
 mockInitial.soilMix='all-purpose';
 const ui=render(<Step05/>);
 fireEvent.press(ui.getByText('all-purpose'));
 fireEvent.press(ui.getAllByText('Not specified')[1]);
 expect(mockSoil).toHaveBeenCalledTimes(1);
 expect(mockSoil).toHaveBeenLastCalledWith(undefined);
 expect(ui.getAllByText('Not specified')).toHaveLength(2);
});


it('highlights every recommended container only in the expanded list without selecting it',()=>{
 mockInitial.selectedPlantDefinition.recommended_pot_materials=['terracotta','plastic'];
 const ui=render(<Step05/>);
 expect(ui.queryByText('Recommended')).toBeNull();
 fireEvent.press(ui.getAllByText('Not specified')[0]);
 expect(ui.getAllByText('Recommended')).toHaveLength(2);
 expect(StyleSheet.flatten(ui.getByTestId('material-option-terracotta').props.style).backgroundColor).toBeTruthy();
 expect(mockMaterial).not.toHaveBeenCalled();
 expect(mockSoil).not.toHaveBeenCalled();
});
it('highlights recommended soils beneath their thumbnails and leaves other rows unchanged',()=>{
 const ui=render(<Step05/>);
 fireEvent.press(ui.getAllByText('Not specified')[1]);
 expect(ui.getByText('Recommended')).toBeTruthy();
 expect(StyleSheet.flatten(ui.getByTestId('soil-option-all-purpose').props.style).backgroundColor).toBeTruthy();
 expect(ui.getByText('Recommended').props.numberOfLines).toBe(2);
 expect(mockSoil).not.toHaveBeenCalled();
});
it('does not add recommendation labels when no definition is linked',()=>{
 mockInitial.selectedPlantDefinition=undefined;
 const ui=render(<Step05/>);
 fireEvent.press(ui.getAllByText('Not specified')[0]);
 expect(ui.queryByText('Recommended')).toBeNull();
 expect(mockMaterial).not.toHaveBeenCalled();
});
