"use client";

import { useState } from "react";
import { DatePicker } from "@/components/DatePicker/DatePicker";
import { Dialog } from "@/components/Dialog/Dialog";

export default function DatePickerDebugPage() {
  const [value, setValue] = useState("1995-04-10");

  return (
    <main className="p-8">
      <Dialog open onClose={function () {}} title="Edit profile">
        <DatePicker id="debug-dob" value={value} onChange={setValue} />
        <output data-testid="debug-dob-value">{value}</output>
      </Dialog>
    </main>
  );
}
