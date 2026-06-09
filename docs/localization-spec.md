# Waiting Room Localization & Terminology Refinement (v1)

## Background

The Multi-House Affiliation Model introduced new affiliation types:

```text
owner
renter
household_member
caretaker
```

While these terms are suitable for the database model, they are not ideal for the primary target audience:

* homeowners
* spouses
* renters
* retirees
* grandparents
* neighborhood volunteers

Most users interact with the platform in Bahasa Indonesia and may not understand property-management terminology such as:

```text
renter
household_member
caretaker
```

without additional explanation.

This change focuses only on user-facing terminology and onboarding UX.

No database schema changes are required.

---

# Design Principle

## Internal Model

Keep existing database values:

```text
owner
renter
household_member
caretaker
```

These values remain unchanged.

---

## User Interface

Display localized Indonesian labels.

The UI should never expose raw database values.

---

# Participant Type Localization

## Current UI

```text
Who are you in this community?

Resident
Non-Resident
```

## Revised UI

```text
Peran Anda di Lingkungan Ini

Warga
Non-Warga
```

Mappings:

| UI Label  | Database Value |
| --------- | -------------- |
| Warga     | resident       |
| Non-Warga | non_resident   |

---

# House Relationship Localization

## Current UI

```text
Relationship To House
```

## Revised UI

```text
Status Anda di Rumah Ini
```

This wording is easier for residents to understand.

---

# Affiliation Label Localization

## Current Labels

```text
Owner
Renter
Household Member
Caretaker
```

## Revised Labels

| Database Value   | UI Label                  |
| ---------------- | ------------------------- |
| owner            | Pemilik Rumah             |
| renter           | Penyewa Rumah             |
| household_member | Anggota Keluarga Serumah  |
| caretaker        | Penjaga / Pengelola Rumah |

---

# Contextual Help Text

Users should not be expected to understand affiliation types without guidance.

The onboarding form should display explanatory text below the affiliation selector.

---

## Owner

When selected:

```text
Anda adalah pemilik sah rumah ini.
```

---

## Renter

When selected:

```text
Anda adalah penyewa utama rumah ini.
```

---

## Household Member

When selected:

```text
Contoh:

• Suami / istri pemilik rumah
• Anak pemilik rumah
• Orang tua yang tinggal bersama
• Suami / istri penyewa
• Anak penyewa

Pilih opsi ini jika Anda tinggal di rumah tersebut tetapi bukan pemilik atau penyewa utama.
```

---

## Caretaker

When selected:

```text
Anda bertanggung jawab menjaga atau mengelola rumah ini.
```

---

# Waiting Room Resident Flow

## Current

```text
Resident
Relationship To House
House Number
```

## Revised

```text
Warga

Status Anda di Rumah Ini
[ Pemilik Rumah ▼ ]

Nomor Rumah
[ E7 ▼ ]
```

Display contextual explanation below the selected relationship.

---

# Waiting Room Non-Resident Flow

## Current

```text
Non-Resident

Requested Affiliation
Associated House (Optional)
Relationship To House
```

## Revised

```text
Non-Warga

Peran yang Diajukan
Associated House (Optional)
```

Remove:

```text
Relationship To House
```

from the Non-Warga onboarding flow.

Reason:

For most non-resident applicants, house relationship is not necessary during registration.

Examples:

```text
Secretariat Admin
Treasurer
Committee Member
Resident Assistant
```

can be approved without asking the applicant whether they are owner, renter, or household member.

If house relationship becomes relevant later, administrators can assign it after verification.

---

# Optional House Localization

Current:

```text
Associated House (Optional)
```

Revised:

```text
Nomor Rumah Terkait (Opsional)
```

---

# Requested Affiliation Localization

Current:

```text
Requested Affiliation
```

Revised:

```text
Peran yang Diajukan
```

Examples:

```text
Sekretariat
Asisten Warga
Bendahara
Pengurus Lingkungan
```

(Actual values depend on existing role catalog.)

---

# Validation Rules

## Warga

Required:

```text
Nomor Rumah
Status Anda di Rumah Ini
```

---

## Non-Warga

Required:

```text
Peran yang Diajukan
```

Optional:

```text
Nomor Rumah Terkait
```

No relationship selection required.

---

# Scope

This change is purely a UX and localization improvement.

No changes to:

* database schema
* profile_house_affiliations
* RLS policies
* approval workflows
* multi-house implementation

are required.

Only onboarding terminology, labels, and explanatory text should be updated.
