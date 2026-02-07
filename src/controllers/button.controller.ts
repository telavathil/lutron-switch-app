import { Controller, Get, Post, Param, Body, Render } from "@nestjs/common";
import { KeypadService } from "../services/keypad.service";
import { UpdateButtonDto } from "../dto/button.dto";

@Controller()
export class ButtonController {
  constructor(private readonly keypadService: KeypadService) {}

  @Get("button/:id/edit")
  @Render("editor/button-form")
  async getButtonEditor(@Param("id") id: string) {
    const button = this.keypadService.findButtonById(id);
    const loads = this.keypadService.getAllLoads();

    return {
      button,
      loads,
      allLoads: loads,
    };
  }

  @Post("button/:id")
  @Render("keypad/visualizer")
  async updateButton(
    @Param("id") id: string,
    @Body() updateDto: UpdateButtonDto,
  ) {
    const keypad = this.keypadService.updateButton(id, updateDto);

    return {
      keypad,
    };
  }

  @Get("button/:id/add-on-action")
  @Render("editor/action-field")
  async addOnAction(@Param("id") id: string) {
    const button = this.keypadService.findButtonById(id);
    const loads = this.keypadService.getAllLoads();
    const index = button.logic.actions.on?.length || 0;

    return {
      actionType: "onActions",
      index,
      color: "#81c995",
      borderColor: "rgba(129, 201, 149, 0.1)",
      defaultLevel: 100,
      loads,
    };
  }

  @Get("button/:id/add-off-action")
  @Render("editor/action-field")
  async addOffAction(@Param("id") id: string) {
    const button = this.keypadService.findButtonById(id);
    const loads = this.keypadService.getAllLoads();
    const index = button.logic.actions.off?.length || 0;

    return {
      actionType: "offActions",
      index,
      color: "#9a9a9a",
      borderColor: "rgba(74, 74, 74, 0.1)",
      defaultLevel: 0,
      loads,
    };
  }

  @Get("button/:id/add-press-action")
  @Render("editor/action-field")
  async addPressAction(@Param("id") id: string) {
    const button = this.keypadService.findButtonById(id);
    const loads = this.keypadService.getAllLoads();
    const index = button.logic.actions.press?.length || 0;

    return {
      actionType: "pressActions",
      index,
      color: "var(--color-amber)",
      borderColor: "rgba(255, 255, 255, 0.05)",
      defaultLevel: 100,
      loads,
    };
  }

  @Get("button/:id/add-doubletap-action")
  @Render("editor/action-field")
  async addDoubleTapAction(@Param("id") id: string) {
    const button = this.keypadService.findButtonById(id);
    const loads = this.keypadService.getAllLoads();
    const index = button.logic.actions.doubleTap?.length || 0;

    return {
      actionType: "doubleTapActions",
      index,
      color: "#8ab4f8",
      borderColor: "rgba(139, 180, 248, 0.1)",
      defaultLevel: 30,
      loads,
    };
  }
}
