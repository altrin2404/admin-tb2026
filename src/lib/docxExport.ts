import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  PageOrientation,
  BorderStyle,
  ShadingType,
} from 'docx';

export interface ParticipantDocxData {
  participantNumber: number;
  participantId?: string;
  formattedParticipantId?: string;
  teamId?: string | null;
  teamName?: string | null;
  name: string;
  department?: string | null;
  year?: string | null;
  college: string;
  phone: string;
  email: string;
  allEvents?: string[];
  techEventsList?: string[];
  nonTechEventsList?: string[];
  eventSequenceId?: string;
  isEntered?: boolean;
  isVerified?: boolean;
}

const tableBorder = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: '94A3B8',
};

const cellBorders = {
  top: tableBorder,
  bottom: tableBorder,
  left: tableBorder,
  right: tableBorder,
};

function createHeaderCell(text: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: '1E3A8A' }, // Dark Blue
    margins: { top: 120, bottom: 120, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            color: 'FFFFFF',
            size: 18, // 9pt
            font: 'Calibri',
          }),
        ],
      }),
    ],
    borders: cellBorders,
  });
}

function createDataCell(
  text: string,
  widthPercent: number,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
  bold: boolean = false
): TableCell {
  const lines = text.split('\n');
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: lines.map(
      (line) =>
        new Paragraph({
          alignment: align,
          children: [
            new TextRun({
              text: line,
              bold,
              size: 17, // 8.5pt
              font: 'Calibri',
              color: '0F172A',
            }),
          ],
        })
    ),
    borders: cellBorders,
  });
}

/**
 * 1. Master Sheet DOCX Export
 * Columns: Serial Number, Name, Department, Year, College Name, Phone Number, Email Address, Events, Status, Signature (Empty)
 */
export async function exportMasterSheetDocx(participants: ParticipantDocxData[]) {
  const rows: TableRow[] = [];

  // Header Row
  rows.push(
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell('S.No', 5),
        createHeaderCell('Participant ID', 10),
        createHeaderCell('Participant Name', 14),
        createHeaderCell('Department', 10),
        createHeaderCell('Year', 5),
        createHeaderCell('College Name', 15),
        createHeaderCell('Phone', 9),
        createHeaderCell('Email Address', 13),
        createHeaderCell('Events', 10),
        createHeaderCell('Status', 5),
        createHeaderCell('Signature', 4),
      ],
    })
  );

  // Data Rows
  participants.forEach((p, idx) => {
    const eventsStr = p.allEvents?.join(', ') || 'General';
    const statusStr = p.isEntered ? 'ENTERED' : p.isVerified ? 'VERIFIED' : 'PENDING';
    const partId = p.participantId || p.formattedParticipantId || `TB${String(idx + 1).padStart(3, '0')}`;

    rows.push(
      new TableRow({
        children: [
          createDataCell((idx + 1).toString(), 5, AlignmentType.CENTER, true),
          createDataCell(partId, 10, AlignmentType.CENTER, true),
          createDataCell(p.name, 14, AlignmentType.LEFT, true),
          createDataCell(p.department || 'IT', 10),
          createDataCell(p.year || '3rd', 5, AlignmentType.CENTER),
          createDataCell(p.college, 15),
          createDataCell(p.phone, 9),
          createDataCell(p.email, 13),
          createDataCell(eventsStr, 10),
          createDataCell(statusStr, 5, AlignmentType.CENTER),
          createDataCell('', 4), // Signature empty box
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 }, // 0.5 inch margins
            size: { orientation: PageOrientation.LANDSCAPE },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "ST. XAVIER'S CATHOLIC COLLEGE OF ENGINEERING",
                bold: true,
                size: 24, // 12pt
                font: 'Calibri',
                color: '1E3A8A',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'DEPARTMENT OF INFORMATION TECHNOLOGY — TECHBETA 2026 2.0',
                bold: true,
                size: 22,
                font: 'Calibri',
                color: '0284C7',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `MASTER PARTICIPANT ATTENDANCE ROSTER (Total Registered: ${participants.length})`,
                bold: true,
                size: 19,
                font: 'Calibri',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TechBETA-2026-2.0-Master-Sheet.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 2. Event-Specific DOCX Export
 * Columns: Serial Number, Name, Department, College, Phone Number, Email, Signature (Empty)
 * If team registration: both members' names, phone, email grouped in a single row!
 */
export async function exportEventRosterDocx(
  event: { name: string; shortCode: string; category: string; currentType: string },
  participants: ParticipantDocxData[]
) {
  // A competition has team rows if configured as team OR if participants have team IDs
  const isTeam = event.currentType.toLowerCase().includes('team') || participants.some((p) => Boolean(p.teamId));
  const rows: TableRow[] = [];

  // Header Row matching exact user columns: S.No, Name, Department, College, Phone Number, Email, Signature
  rows.push(
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell('S.No', 6),
        createHeaderCell(isTeam ? 'Team & Participant Name(s)' : 'Participant Name', 26),
        createHeaderCell('Department', 13),
        createHeaderCell('College', 20),
        createHeaderCell('Phone Number', 14),
        createHeaderCell('Email', 13),
        createHeaderCell('Signature', 8),
      ],
    })
  );

  if (isTeam) {
    // Group participants by teamId if present
    const teamsMap = new Map<string, ParticipantDocxData[]>();
    const singles: ParticipantDocxData[] = [];

    participants.forEach((p) => {
      if (p.teamId) {
        if (!teamsMap.has(p.teamId)) {
          teamsMap.set(p.teamId, []);
        }
        teamsMap.get(p.teamId)!.push(p);
      } else {
        singles.push(p);
      }
    });

    let sNo = 1;

    // Output grouped teams (both members in a single row!)
    teamsMap.forEach((members, teamId) => {
      const eventSlotId = members[0]?.eventSequenceId || sNo.toString();
      const namesStr = members
        .map((m, i) => `${i + 1}. ${m.name} [Master: ${m.participantId || m.formattedParticipantId || ''}]`)
        .join('\n');
      const teamTitle = members[0].teamName ? `[${members[0].teamName}]\n` : ``;
      const combinedNames = teamTitle + namesStr;

      const deptsStr = Array.from(new Set(members.map((m) => m.department || 'IT'))).join(' / ');
      const collegeStr = members[0]?.college || '';
      const phonesStr = members.map((m) => m.phone).join('\n');
      const emailsStr = members.map((m) => m.email).join('\n');

      rows.push(
        new TableRow({
          children: [
            createDataCell(eventSlotId, 6, AlignmentType.CENTER, true),
            createDataCell(combinedNames, 25, AlignmentType.LEFT, true),
            createDataCell(deptsStr, 13),
            createDataCell(collegeStr, 20),
            createDataCell(phonesStr, 14),
            createDataCell(emailsStr, 14),
            createDataCell('', 8), // Signature empty box
          ],
        })
      );
      sNo++;
    });

    // Output any remaining single participants in the event
    singles.forEach((p) => {
      const eventSlotId = p.eventSequenceId || sNo.toString();
      const pLabel = p.participantId || p.formattedParticipantId
        ? `${p.name}\n[Master: ${p.participantId || p.formattedParticipantId}]`
        : p.name;
      rows.push(
        new TableRow({
          children: [
            createDataCell(eventSlotId, 6, AlignmentType.CENTER, true),
            createDataCell(pLabel, 25, AlignmentType.LEFT, true),
            createDataCell(p.department || 'IT', 13),
            createDataCell(p.college, 20),
            createDataCell(p.phone, 14),
            createDataCell(p.email, 14),
            createDataCell('', 8), // Signature empty box
          ],
        })
      );
      sNo++;
    });
  } else {
    // Individual event: each person is a single row
    participants.forEach((p, idx) => {
      const eventSlotId = p.eventSequenceId || (idx + 1).toString();
      const pLabel = p.participantId || p.formattedParticipantId
        ? `${p.name}\n[Master: ${p.participantId || p.formattedParticipantId}]`
        : p.name;
      rows.push(
        new TableRow({
          children: [
            createDataCell(eventSlotId, 6, AlignmentType.CENTER, true),
            createDataCell(pLabel, 25, AlignmentType.LEFT, true),
            createDataCell(p.department || 'IT', 13),
            createDataCell(p.college, 20),
            createDataCell(p.phone, 14),
            createDataCell(p.email, 14),
            createDataCell('', 8), // Signature empty box
          ],
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
            size: { orientation: PageOrientation.LANDSCAPE },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "ST. XAVIER'S CATHOLIC COLLEGE OF ENGINEERING",
                bold: true,
                size: 24,
                font: 'Calibri',
                color: '1E3A8A',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `TECHBETA 2026 2.0 — ${event.name.toUpperCase()} (${event.shortCode})`,
                bold: true,
                size: 22,
                font: 'Calibri',
                color: '0284C7',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `EVENT PARTICIPANT ATTENDANCE & JUDGING SHEET (${event.currentType}) — Total: ${participants.length}`,
                bold: true,
                size: 19,
                font: 'Calibri',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TechBETA-2026-2.0-${event.shortCode}-Roster.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
