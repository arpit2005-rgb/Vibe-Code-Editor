import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingStep from "./loader";

describe("LoadingStep", () => {
  it("renders the provided label", () => {
    render(<LoadingStep currentStep={1} step={1} label="Loading playground data" />);
    expect(screen.getByText("Loading playground data")).toBeInTheDocument();
  });

  it("renders a spinner and applies active styling when currentStep equals step", () => {
    const { container } = render(
      <LoadingStep currentStep={2} step={2} label="Setting up environment" />,
    );

    const label = screen.getByText("Setting up environment");
    expect(label.className).toContain("text-red-600");
    expect(label.className).toContain("font-medium");

    // Loader2 from lucide-react renders an <svg> with the animate-spin class
    const spinner = container.querySelector("svg.animate-spin");
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveClass("text-red-500");
  });

  it("renders a checkmark and green styling when currentStep is greater than step", () => {
    const { container } = render(
      <LoadingStep currentStep={3} step={1} label="Loading playground data" />,
    );

    const label = screen.getByText("Loading playground data");
    expect(label.className).toContain("text-green-600");

    const checkmark = container.querySelector("svg:not(.animate-spin)");
    expect(checkmark).not.toBeNull();
    expect(checkmark).toHaveClass("text-green-500");

    // No spinner should be present once the step is complete
    expect(container.querySelector("svg.animate-spin")).toBeNull();
  });

  it("renders a neutral gray indicator and gray text when currentStep is less than step", () => {
    const { container } = render(
      <LoadingStep currentStep={1} step={3} label="Ready to code" />,
    );

    const label = screen.getByText("Ready to code");
    expect(label.className).toContain("text-gray-500");

    // Neither the spinner nor the checkmark svg should be rendered
    expect(container.querySelector("svg")).toBeNull();
    // Instead, a plain gray circle placeholder div is rendered
    expect(container.querySelector(".bg-gray-300")).not.toBeNull();
  });

  it("applies the pending background color to the icon wrapper when step has not started", () => {
    const { container } = render(
      <LoadingStep currentStep={1} step={2} label="Pending step" />,
    );
    const wrapper = container.querySelector(".rounded-full");
    expect(wrapper).toHaveClass("bg-gray-100");
  });

  it("applies the active background color to the icon wrapper when step is in progress", () => {
    const { container } = render(
      <LoadingStep currentStep={2} step={2} label="Active step" />,
    );
    const wrapper = container.querySelector(".rounded-full");
    expect(wrapper).toHaveClass("bg-red-100");
  });

  it("applies the completed background color to the icon wrapper when step is done", () => {
    const { container } = render(
      <LoadingStep currentStep={5} step={2} label="Completed step" />,
    );
    const wrapper = container.querySelector(".rounded-full");
    expect(wrapper).toHaveClass("bg-green-100");
  });
});