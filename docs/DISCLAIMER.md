# Legal Disclaimer and Copyright Notice

**Version:** 1.0
**Last updated:** June 2026
**Issuing entity:** vkara open-source project
**Contact for complaints, takedown requests, and support:** [lehuygiang28@gmail.com](mailto:lehuygiang28@gmail.com)

---

## 1. Purpose

This document describes the functional scope of the vkara software, how the Project distributes it, how responsibility is allocated among the parties involved, and procedures for handling complaints about copyright, related rights, and third-party service terms.

The vkara Project is open-source software used worldwide. Users and deployers must comply with the laws of the country or region where they use or operate the Software.

## 2. Not legal advice

The text below is for information only. It does not replace legal advice. Users, deployers, and operators must determine their obligations under the laws that apply where they live or operate a service, and consult a lawyer when needed.

## 3. Definitions

1. **vkara Project** or **Software**: the open-source program distributed under the [MIT License](../LICENSE).
2. **End User**: any person or organization using the Software through its application interface.
3. **Deployer** or **Operator**: any person or organization that installs, runs, or provides the Software to third parties.
4. **Rights Holder**: an author, copyright owner, related-rights owner, or their authorized representative.
5. **Third-Party Content**: videos, audio, images, playlists, and related data supplied by YouTube or its users. The vkara Project does not own this content.
6. **Commercial use**: any use of the Software or of content played through it for business, profit, paid public events, commercial promotion, or as a substitute for licensed karaoke or music services.

---

## 4. Functional scope of the Software

The vkara software lets multiple users search YouTube video metadata, manage a temporary playback queue, and play content through the **YouTube IFrame Player** (YouTube's embeddable player) in a web browser.

The Software is intended for **personal, non-commercial karaoke** within the scope allowed by YouTube's embedded player. The Project **does not** commercialize music or video content and **does not** provide music licensing services.

The Software does not:

1. Store, download, extract, transcode, or distribute YouTube audio or video files on the operator's servers;
2. Play back independently outside the YouTube embedded player (all playback occurs inside the iframe controlled by YouTube);
3. Sell, lease, license, transfer, or commercially distribute music or video content;
4. Claim ownership of third-party works, performances, sound recordings, or broadcast programs;
5. Represent, affiliate with, endorse, or belong to YouTube, Google LLC, TikTok, or any other streaming platform.

The Software may:

1. Query video metadata and/or provide search suggestions;
2. Play videos via the YouTube IFrame Player using YouTube's embedding mechanism;
3. Exclude videos that disallow embedding from the playback flow;
4. Show suggested playlists configured by the operator as YouTube playlist links or identifiers, not as locally stored copies.

**Search and metadata note:** Some search and metadata features may rely on third-party libraries (for example `youtubei`) and may not be equivalent to the official YouTube Data API. Deployers must assess and remain responsible for platform-term compliance when using those components.

---

## 5. YouTube Terms and intended use

Under the [YouTube Terms of Service](https://www.youtube.com/t/terms), within the scope of those terms, users may view and listen to content for **personal, non-commercial** purposes and may **show videos through the YouTube embedded player** as provided by YouTube. Uploaders grant other users rights to use content through the Service (for example playback or embedding), but not to use content independently outside the Service.

The same terms prohibit public screening or streaming outside personal, non-commercial use, and prohibit use of the Service or Content in ways not permitted by YouTube or Rights Holders.

The vkara Project is **designed for** use of the YouTube embedded player for personal, non-commercial purposes: playback via iframe, no separate media stream outside YouTube, no sale or re-licensing of content. This document does not assert that every deployment or every dependency is compliant with YouTube's terms. Any **commercial use** (commercial karaoke venues, ticketed events, profit-seeking live streams, etc.) is outside the Project's intended scope and is the responsibility of the user or operator.

### 5.1. YouTube Player/API compliance

End Users, deployers, and operators must not use the Software or modified versions of it to:

1. Download, proxy, cache, store, extract audio/video from, or play YouTube content offline;
2. Bypass embedding limits, geographic limits, age limits, or YouTube's technical protection measures;
3. Cover, modify, disable, or interfere with the YouTube player, logo, controls, attribution, or advertising;
4. Scrape YouTube, use undocumented APIs, or access YouTube by methods YouTube does not permit;
5. Charge users to view YouTube content in an embedded player, or sell advertising or sponsorship based primarily on YouTube content, unless permitted.

The YouTube embed must meet YouTube's minimum display size (for example 200×200 pixels). If autoplay is enabled, the player must be visible on screen. WebView or desktop apps that embed the player must provide client identity via HTTP Referer or an equivalent mechanism as required by YouTube.

---

## 6. Copyright and legal compliance

Copyright and related rights in musical works and videos belong to authors, performers, producers, and other rights holders protected by law. Public performance, broadcast, communication, or commercial exploitation of such works (including via YouTube) at business premises, ticketed events, or profit-seeking live streams often requires **permission and/or royalty payment** under the law that applies where the activity takes place. Rules differ by country.

Some karaoke or music videos on YouTube may be uploaded, edited, or re-published by users in ways the vkara Project **cannot verify** on a per-item basis. End Users and Operators remain responsible for choosing and using content.

Licensed streaming platforms, subscription music services, and commercial karaoke systems operate under licensing and royalty arrangements. The vkara Project has no music licensing agreements and does not replace those services.

---

## 7. Legal responsibility

### 7.1. End Users

1. Use the Software for personal, non-commercial purposes unless they hold permission, licenses, or other valid legal authority under applicable law;
2. Comply with copyright and related-rights law where they use the Software and with YouTube's Terms of Service;
3. Not use the Software for commercial use without appropriate legal grounds.

### 7.2. Deployers and Operators

Deployers and Operators are responsible for how they provide, configure, promote, and operate the version of the Software they run, within applicable law and within the parts they control.

For public deployments, operators should establish an acceptable-use policy, a contact point for complaints, and a process to handle, remove, or block access to content, playlists, or configuration they control when they receive valid notice.

Deployers may change or remove suggested playlists in `packages/curated-playlists/` as needed.

### 7.3. Authors and maintainers

Authors and maintainers of the vkara Project:

1. Distribute the Software on an *as-is* basis under the MIT License;
2. Do not commercialize music or video content or sell rights to third-party content;
3. Do not warrant that all YouTube content is lawful for every use;
4. Accept rights-holder complaints at the email address above and handle valid complaints within a reasonable time for project-controlled parts (suggested playlist catalog, documentation, public demo instances if any).

### 7.4. Disclaimer for third-party commercial use

The vkara Project **disclaims responsibility** when third parties (End Users, deployers, their customers, or any other person or organization) use the Software to:

1. Commercialize, profit from, or offer paid karaoke or content services;
2. Perform publicly at commercial premises, ticketed events, or profit-seeking live streams without appropriate legal grounds;
3. Violate YouTube's terms, copyright, or related rights in the country where they operate.

Publishing open-source code **does not** mean the Project authorizes, encourages, or accepts liability for commercial use that third parties choose on their own.

### 7.5. Applicable law

Copyright, intermediary-service, and platform liability rules **vary by country**. Deployers and operators should understand the rules where they provide service, including (where they exist) complaint handling, content removal, and intermediary liability exemptions.

The MIT License limits liability for software defects and warranties only. It does not exempt liability arising from intellectual property violations or unlawful commercial use by third parties.

Disclaimers do not remove mandatory legal duties under applicable law, including when the Project or an operator receives valid notice from a Rights Holder and fails to act on parts they control.

---

## 8. Complaints and takedown requests

Rights Holders, authorized representatives, or parties authorized by YouTube/Google may submit complaints if they believe the vkara Project infringes their intellectual property rights or other lawful interests.

**Email:** [lehuygiang28@gmail.com](mailto:lehuygiang28@gmail.com)

A complaint should include:

1. Name, contact address, and verification details of the submitter;
2. URL(s) of the video or playlist at issue, or a description of content in the project-maintained suggested catalog;
3. Evidence of ownership or valid authorization;
4. A good-faith statement that the use is not licensed or authorized.

After review, the Project may remove corresponding entries from suggested playlist catalogs, update documentation or public demo deployments, and advise self-hosting deployers to take equivalent measures.

The Software does not host video files on servers. Removing content on YouTube is decided by YouTube and the uploader.

---

## 9. MIT License

The Software is provided *AS IS* without warranty. See [LICENSE](../LICENSE).

The MIT License does not grant permission to infringe third-party copyrights, does not guarantee that every deployment complies with YouTube's terms, and does not shield liability when users or third parties intentionally break the law or use the Software for unlawful commercial purposes.

---

## 10. Recommendations

1. Private, non-profit personal use: follow YouTube's Terms and the law where you use the Software.
2. Commercial venues, ticketed events, or profit-seeking live streams: obtain permission, licenses, and/or pay royalties under applicable law, or use properly licensed services. The vkara Software does not replace those services.
3. Self-hosted deployment: review third-party search/metadata libraries and suggested playlist catalogs; disable or replace them when needed.
4. Marketing: do not promote the Software for unlawful commercial use.

---

## Related documents

- [English README](../README.md)
- [Tiếng Việt README](vi/README.md)
- [Tuyên bố pháp lý (Tiếng Việt)](vi/DISCLAIMER.md)
