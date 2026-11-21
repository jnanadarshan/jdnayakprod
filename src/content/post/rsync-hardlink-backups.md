---
publishDate: 2026-09-10T00:00:00Z
title: 'Backups with rsync and hardlinks: simple, boring, effective'
excerpt: Snapshot-style backups from a few lines of rsync. Why I chose simplicity over heavier tooling for the homelab.
image: ~/assets/images/homelab.svg
category: Homelab
tags:
  - backup
  - rsync
  - nfs
author: JD Nayak
---

My homelab backups use rsync with hardlinks to an NFS share. It is the least exciting backup design I know, which is exactly why I trust it.

## The idea

Each run creates a new dated directory that looks like a full copy of the source. Files that did not change since the previous run are not copied again. They are hardlinks to the previous copy, so they take no extra space. Files that changed are copied fresh.

rsync does this with the `--link-dest` option:

```bash
rsync -a --delete --link-dest=/backups/latest /data/ /backups/$(date +%F)/
ln -sfn /backups/$(date +%F) /backups/latest
```

Every dated folder is browsable as a complete snapshot, and restoring a file is a plain copy.

## Why not something heavier

Dedicated backup tools add deduplication, encryption and catalogues. Those are real benefits, and I use them where they matter. For this use case, the plain-files approach wins on three counts:

- **Restores need no special tooling.** Any machine that can mount the share can read the backup.
- **Few moving parts.** There is no repository format to corrupt.
- **Easy to reason about.** I can explain the whole system in two minutes.

## Rules I follow

- Test a restore regularly. A backup you cannot restore is a hope, not a backup.
- Keep a copy somewhere that is not the same box or the same room.
- Prune old snapshots on a schedule so the share does not fill up.

Backups you can restore beat backups you can brag about.
