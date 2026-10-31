import { isJournalPhoto, journalEntryKey, type JournalEntry } from "../task-history.types";

describe("journal entry identity", () => {
  it("keeps task and photo identifiers separate", () => {
    const task = { id: "14", type: "watering" } as JournalEntry;
    const photo = { id: "14", type: "photo", entryKind: "photo" } as JournalEntry;
    expect(journalEntryKey(task)).toBe("task:14");
    expect(journalEntryKey(photo)).toBe("photo:14");
    expect(isJournalPhoto(task)).toBe(false);
    expect(isJournalPhoto(photo)).toBe(true);
  });
});
