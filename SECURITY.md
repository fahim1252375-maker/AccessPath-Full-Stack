# Security Policy

## Supported versions

Security fixes are intended for the current default branch. This repository is an actively developed project; no separate long-term support release policy is currently defined.

## Reporting a vulnerability

**Please do not disclose exploitable vulnerabilities in a public issue.**

Use GitHub's private vulnerability reporting feature for this repository when it is available. If private reporting is unavailable, contact the repository owner through the contact options on the GitHub profile and include:

- A concise description of the vulnerability and its potential impact.
- Affected files, endpoints, versions, or commit references.
- Reproduction steps or a proof of concept that does not access real user data.
- Any suggested mitigation, if known.

Do not include real credentials, personal information, or sensitive campus data in a report.

## What to expect

The maintainer will review the report, may request additional details, and will work toward a reasonable fix and coordinated disclosure. Response and remediation timelines are not guaranteed.

## Security-sensitive areas

Areas that deserve careful review include authentication and session lifecycle, authorization and campus scoping, CSRF/Origin validation, password reset and verification tokens, file uploads and image processing, API rate limiting, environment configuration, and production startup behavior.

## Responsible testing

Only test systems and accounts you own or have explicit permission to assess. Do not attempt to access, modify, or disclose another person's data.
