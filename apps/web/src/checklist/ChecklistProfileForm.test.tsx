import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  CHECKLIST_PROFILE_FIELD_NAMES,
  ChecklistProfileForm,
  EMPTY_CHECKLIST_PROFILE,
  defaultChecklistProfileFormLabels,
} from "./ChecklistProfileForm";

describe("ChecklistProfileForm", () => {
  it("renders exactly the six optional profile fields with accessible instructions and states", () => {
    const { container } = render(<ChecklistProfileForm />);

    expect(
      screen.getByRole("heading", {
        name: defaultChecklistProfileFormLabels.heading,
      }),
    ).toBeVisible();

    const namedControls = Array.from(
      container.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input[name], select[name]",
      ),
    );

    expect(namedControls.map((control) => control.name)).toEqual(
      CHECKLIST_PROFILE_FIELD_NAMES,
    );
    expect(screen.getByRole("spinbutton", {
      name: /Household size \/ Saiz isi rumah/,
    })).toHaveAccessibleDescription(
      defaultChecklistProfileFormLabels.householdSizeInstruction,
    );
    expect(screen.getAllByRole("combobox")).toHaveLength(5);
    expect(
      screen.getByRole("combobox", {
        name: /Children in the household \/ Kanak-kanak/,
      }),
    ).toHaveValue("");

    for (const forbiddenLabel of [
      /name|identity/i,
      /diagnosis/i,
      /address/i,
      /medication/i,
    ]) {
      expect(
        screen.queryByRole("textbox", { name: forbiddenLabel }),
      ).not.toBeInTheDocument();
    }
  });

  it("submits the empty optional profile as the canonical six-field object", async () => {
    const user = userEvent.setup();
    const onSubmitProfile = vi.fn();

    render(<ChecklistProfileForm onSubmitProfile={onSubmitProfile} />);
    await user.click(
      screen.getByRole("button", {
        name: defaultChecklistProfileFormLabels.submit,
      }),
    );

    expect(onSubmitProfile).toHaveBeenCalledOnce();
    expect(onSubmitProfile).toHaveBeenCalledWith(EMPTY_CHECKLIST_PROFILE);
    expect(Object.keys(onSubmitProfile.mock.calls[0]?.[0] ?? {})).toEqual(
      CHECKLIST_PROFILE_FIELD_NAMES,
    );
  });

  it("keeps drafts in the component and produces the same canonical profile regardless of interaction order", async () => {
    const firstUser = userEvent.setup();
    const firstSubmit = vi.fn();
    const firstRender = render(
      <ChecklistProfileForm onSubmitProfile={firstSubmit} />,
    );

    await firstUser.selectOptions(
      screen.getByRole("combobox", { name: /Pets in the household/ }),
      "true",
    );
    await firstUser.type(
      screen.getByRole("spinbutton", { name: /Household size/ }),
      "4",
    );
    await firstUser.selectOptions(
      screen.getByRole("combobox", { name: /Transport available/ }),
      "false",
    );
    await firstUser.click(screen.getByRole("button", { name: /Use household/ }));

    firstRender.unmount();

    const secondUser = userEvent.setup();
    const secondSubmit = vi.fn();
    render(<ChecklistProfileForm onSubmitProfile={secondSubmit} />);

    await secondUser.selectOptions(
      screen.getByRole("combobox", { name: /Transport available/ }),
      "false",
    );
    await secondUser.type(
      screen.getByRole("spinbutton", { name: /Household size/ }),
      "4",
    );
    await secondUser.selectOptions(
      screen.getByRole("combobox", { name: /Pets in the household/ }),
      "true",
    );
    await secondUser.click(
      screen.getByRole("button", { name: /Use household/ }),
    );

    const expectedProfile = {
      householdSize: 4,
      hasChildren: null,
      hasElderlyMembers: null,
      needsMobilityAssistance: null,
      hasPets: true,
      hasTransport: false,
    };
    expect(firstSubmit).toHaveBeenCalledWith(expectedProfile);
    expect(secondSubmit).toHaveBeenCalledWith(expectedProfile);
  });

  it("associates an assertive error, invalid state, and focus with an invalid household size", async () => {
    const user = userEvent.setup();
    const onSubmitProfile = vi.fn();

    render(<ChecklistProfileForm onSubmitProfile={onSubmitProfile} />);
    const householdSize = screen.getByRole("spinbutton", {
      name: /Household size/,
    });

    await user.type(householdSize, "101");
    await user.click(screen.getByRole("button", { name: /Use household/ }));

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent(
      defaultChecklistProfileFormLabels.householdSizeError,
    );
    expect(householdSize).toHaveAttribute("aria-invalid", "true");
    expect(householdSize).toHaveAccessibleDescription(
      `${defaultChecklistProfileFormLabels.householdSizeInstruction} ${defaultChecklistProfileFormLabels.householdSizeError}`,
    );
    expect(householdSize).toHaveFocus();
    expect(onSubmitProfile).not.toHaveBeenCalled();

    await user.clear(householdSize);
    await user.type(householdSize, "100");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(householdSize).not.toHaveAttribute("aria-invalid");

    await user.click(screen.getByRole("button", { name: /Use household/ }));
    expect(onSubmitProfile).toHaveBeenCalledWith({
      ...EMPTY_CHECKLIST_PROFILE,
      householdSize: 100,
    });
  });

  it("preserves the client-side draft across presentational rerenders without storage or network access", async () => {
    const user = userEvent.setup();
    const storageSet = vi.spyOn(Storage.prototype, "setItem");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { rerender } = render(<ChecklistProfileForm />);

    await user.type(
      screen.getByRole("spinbutton", { name: /Household size/ }),
      "3",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: /Children in the household/ }),
      "true",
    );

    rerender(
      <ChecklistProfileForm
        labels={{
          ...defaultChecklistProfileFormLabels,
          heading: "Butiran isi rumah",
        }}
      />,
    );
    window.dispatchEvent(new Event("orientationchange"));

    expect(screen.getByRole("spinbutton", { name: /Household size/ })).toHaveValue(3);
    expect(
      screen.getByRole("combobox", { name: /Children in the household/ }),
    ).toHaveValue("true");
    expect(storageSet).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
