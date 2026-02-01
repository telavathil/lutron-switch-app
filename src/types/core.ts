export interface Location {
  area: string;
  room: string;
  subLocation?: string;
}

export type KeypadModel = '6-button' | 'hybrid-6' | 'dimmer' | 'other';

export interface Wallplate {
  type: string;
  color: 'BL' | 'WH';
  gangPosition: number;
  backboxSize: number;
}

export interface Faceplate {
  label?: string;
  alignment: string;
  fontType: string;
  fontSize: number;
}

export interface RaiseLowerButton {
  inputNumber: number;
  label: string;
}

export interface Keypad {
  id: string;
  location: Location;
  model: KeypadModel;
  wallplate: Wallplate;
  faceplate: Faceplate;
  buttons: Button[];
  raiseLowerButtons?: {
    raise: RaiseLowerButton;
    lower: RaiseLowerButton;
  };
}

export interface ButtonEngraving {
  label: string;
  alignment: string;
  fontType: string;
  fontSize: number;
}

export type ButtonType = 'toggle' | 'single-action';
export type LEDLogicType = 'scene' | 'room' | 'local-load';

export interface LEDLogic {
  type: LEDLogicType;
  sceneNumber?: number;
}

export interface LoadAction {
  loadFullPath: string;
  commandLevel: number;
  fadeTime: number;
  delay: number;
}

export interface ButtonActions {
  press?: LoadAction[];
  release?: LoadAction[];
  doubleTap?: LoadAction[];
  hold?: LoadAction[];
}

export interface ButtonLogic {
  type: ButtonType;
  ledLogic: LEDLogic;
  actions: ButtonActions;
}

export interface Button {
  id: string;
  keypadId: string;
  inputNumber: number;
  position: number;
  engraving: ButtonEngraving;
  logic: ButtonLogic;
}

export type LoadType = 'dimmer' | 'switched';

export interface Load {
  id: string;
  fullPath: string;
  location: Location;
  zone: string;
  type: LoadType;
  nominalLoad?: number;
}

export interface ProjectState {
  id: string;
  name: string;
  created: number;
  modified: number;
  originalState: {
    keypads: Keypad[];
    loads: Load[];
  };
  currentState: {
    keypads: Keypad[];
    loads: Load[];
  };
}
