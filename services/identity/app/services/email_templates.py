from html import escape

from app.core.config import Settings
from app.services.brand_tokens import TIP_COLORS as C


def _layout(
    *,
    settings: Settings,
    title: str,
    main_html: str,
    cta_html: str = "",
    secondary_html: str = "",
) -> str:
    app_url = escape(settings.app_public_url.rstrip("/"))
    app_name = escape(settings.app_name)
    page_title = escape(title)

    return f"""\
<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>{page_title}</title>
  <!--[if mso]>
  <style>
    table {{border-collapse:collapse;border-spacing:0;border:none;margin:0;}}
    div, td {{padding:0;}}
    div {{margin:0 !important;}}
  </style>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    table, td, div, h1, p {{
      font-family: Arial, sans-serif;
    }}
    @media screen and (max-width: 530px) {{
      .col-lge {{
        max-width: 100% !important;
      }}
      .col-sml {{
        max-width: 100% !important;
      }}
    }}
    @media screen and (min-width: 531px) {{
      .col-sml {{
        max-width: 27% !important;
      }}
      .col-lge {{
        max-width: 73% !important;
      }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:{C.gray_100};">
  <div role="article" aria-roledescription="email" lang="fr" style="text-size-adjust:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:{C.gray_100};">
    <table role="presentation" style="width:100%;border:none;border-spacing:0;">
      <tr>
        <td align="center" style="padding:0;">
          <!--[if mso]>
          <table role="presentation" align="center" style="width:600px;">
          <tr>
          <td>
          <![endif]-->
          <table role="presentation" style="width:94%;max-width:600px;border:none;border-spacing:0;text-align:left;font-family:Arial,sans-serif;font-size:16px;line-height:22px;color:{C.gray_900};">
            <tr>
              <td style="padding:40px 30px 24px 30px;text-align:center;background-color:{C.white};">
                <a href="{app_url}/signin" style="text-decoration:none;display:inline-block;">
                  <span style="display:block;font-size:13px;font-weight:bold;letter-spacing:0.14em;text-transform:uppercase;color:{C.brand_500};">Traumatec</span>
                  <span style="display:block;margin-top:6px;font-size:22px;line-height:28px;font-weight:bold;color:{C.gray_900};">Impact Platform</span>
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 30px 30px;background-color:{C.white};">
                <h1 style="margin:0 0 16px;font-size:26px;line-height:32px;font-weight:bold;letter-spacing:-0.02em;color:{C.gray_900};">{page_title}</h1>
                {main_html}
              </td>
            </tr>
            <tr>
              <td style="padding:0;font-size:24px;line-height:28px;font-weight:bold;">
                <table role="presentation" style="width:100%;border:none;border-spacing:0;">
                  <tr>
                    <td style="padding:28px 30px;background-color:{C.brand_950};text-align:center;">
                      <p style="margin:0;font-size:18px;line-height:26px;font-weight:bold;color:{C.white};">{app_name}</p>
                      <p style="margin:8px 0 0;font-size:14px;line-height:20px;color:{C.footer_text};">Plateforme de préparation des dossiers AO Alliance</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            {cta_html}
            {secondary_html}
            <tr>
              <td style="padding:30px;text-align:center;font-size:12px;background-color:{C.brand_950};color:{C.footer_text};">
                <p style="margin:0 0 8px 0;font-size:14px;line-height:20px;color:{C.footer_text};">
                  &reg; Traumatec {app_name}
                </p>
                <p style="margin:0;font-size:12px;line-height:18px;color:{C.footer_muted};">
                  Message automatique — ne pas répondre.<br>
                  <a href="{app_url}/signin" style="color:{C.footer_text};text-decoration:underline;">Accéder à la plateforme</a>
                </p>
              </td>
            </tr>
          </table>
          <!--[if mso]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </div>
</body>
</html>"""


def render_invitation_email(
    *,
    settings: Settings,
    prenom: str,
    nom: str,
    invitation_url: str,
) -> str:
    safe_prenom = escape(prenom)
    safe_nom = escape(nom)
    safe_url = escape(invitation_url)

    main_html = f"""\
<p style="margin:0 0 12px;color:{C.gray_900};">Bonjour {safe_prenom} {safe_nom},</p>
<p style="margin:0;color:{C.gray_600};">Un administrateur vous a invité à rejoindre la plateforme. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et activer votre accès.</p>"""

    cta_html = f"""\
<tr>
  <td style="padding:35px 30px 11px 30px;font-size:0;background-color:{C.white};border-bottom:1px solid {C.gray_200};">
    <!--[if mso]>
    <table role="presentation" width="100%">
    <tr>
    <td style="width:145px;" align="left" valign="top">
    <![endif]-->
    <div class="col-sml" style="display:inline-block;width:100%;max-width:145px;vertical-align:top;text-align:center;font-family:Arial,sans-serif;font-size:14px;color:{C.gray_900};">
      <div style="width:96px;height:96px;margin:0 auto 20px;border-radius:16px;background-color:{C.brand_50};line-height:96px;font-size:36px;font-weight:bold;color:{C.brand_500};">T</div>
    </div>
    <!--[if mso]>
    </td>
    <td style="width:395px;padding-bottom:20px;" valign="top">
    <![endif]-->
    <div class="col-lge" style="display:inline-block;width:100%;max-width:395px;vertical-align:top;padding-bottom:20px;font-family:Arial,sans-serif;font-size:16px;line-height:22px;color:{C.gray_900};">
      <p style="margin-top:0;margin-bottom:12px;color:{C.gray_600};">Votre compte est prêt. L&apos;activation ne prend qu&apos;une minute : choisissez un mot de passe sécurisé, puis connectez-vous avec votre email Traumatec.</p>
      <p style="margin-top:0;margin-bottom:18px;color:{C.gray_500};font-size:14px;">Ce lien expire sous 30 jours. Si vous n&apos;êtes pas concerné, ignorez cet email.</p>
      <p style="margin:0;">
        <a href="{safe_url}" style="background:{C.brand_500};text-decoration:none;padding:12px 28px;color:{C.white};border-radius:8px;display:inline-block;mso-padding-alt:0;text-underline-color:{C.brand_500};font-weight:bold;">
          <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;mso-text-raise:20pt">&nbsp;</i><![endif]-->
          <span style="mso-text-raise:10pt;font-weight:bold;">Activer mon compte</span>
          <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%">&nbsp;</i><![endif]-->
        </a>
      </p>
    </div>
    <!--[if mso]>
    </td>
    </tr>
    </table>
    <![endif]-->
  </td>
</tr>"""

    secondary_html = f"""\
<tr>
  <td style="padding:24px 30px 30px 30px;background-color:{C.white};">
    <p style="margin:0 0 8px;font-size:14px;color:{C.gray_500};">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :</p>
    <p style="margin:0;word-break:break-all;font-size:13px;line-height:20px;">
      <a href="{safe_url}" style="color:{C.brand_600};text-decoration:underline;">{safe_url}</a>
    </p>
  </td>
</tr>"""

    return _layout(
        settings=settings,
        title="Invitation à rejoindre la plateforme",
        main_html=main_html,
        cta_html=cta_html,
        secondary_html=secondary_html,
    )


def render_password_reset_email(*, settings: Settings, code: str) -> str:
    safe_code = escape(code)
    reset_url = escape(f"{settings.app_public_url.rstrip('/')}/reset-password")

    main_html = f"""\
<p style="margin:0 0 12px;color:{C.gray_900};">Vous avez demandé à réinitialiser votre mot de passe sur {escape(settings.app_name)}.</p>
<p style="margin:0;color:{C.gray_600};">Saisissez le code ci-dessous sur la page « Mot de passe oublié ». Il expire rapidement.</p>"""

    cta_html = f"""\
<tr>
  <td style="padding:35px 30px 11px 30px;font-size:0;background-color:{C.white};border-bottom:1px solid {C.gray_200};">
    <!--[if mso]>
    <table role="presentation" width="100%">
    <tr>
    <td style="width:145px;" align="left" valign="top">
    <![endif]-->
    <div class="col-sml" style="display:inline-block;width:100%;max-width:145px;vertical-align:top;text-align:center;font-family:Arial,sans-serif;font-size:14px;color:{C.gray_900};">
      <div style="width:96px;height:96px;margin:0 auto 20px;border-radius:16px;background-color:{C.brand_50};line-height:96px;font-size:22px;font-weight:bold;color:{C.brand_500};">PIN</div>
    </div>
    <!--[if mso]>
    </td>
    <td style="width:395px;padding-bottom:20px;" valign="top">
    <![endif]-->
    <div class="col-lge" style="display:inline-block;width:100%;max-width:395px;vertical-align:top;padding-bottom:20px;font-family:Arial,sans-serif;font-size:16px;line-height:22px;color:{C.gray_900};">
      <p style="margin-top:0;margin-bottom:12px;color:{C.gray_600};">Votre code de vérification :</p>
      <p style="margin:0 0 18px;font-size:32px;line-height:38px;font-weight:bold;letter-spacing:0.18em;color:{C.brand_500};">{safe_code}</p>
      <p style="margin:0;">
        <a href="{reset_url}" style="background:{C.brand_500};text-decoration:none;padding:12px 28px;color:{C.white};border-radius:8px;display:inline-block;mso-padding-alt:0;text-underline-color:{C.brand_500};font-weight:bold;">
          <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;mso-text-raise:20pt">&nbsp;</i><![endif]-->
          <span style="mso-text-raise:10pt;font-weight:bold;">Réinitialiser mon mot de passe</span>
          <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%">&nbsp;</i><![endif]-->
        </a>
      </p>
    </div>
    <!--[if mso]>
    </td>
    </tr>
    </table>
    <![endif]-->
  </td>
</tr>"""

    secondary_html = f"""\
<tr>
  <td style="padding:24px 30px 30px 30px;background-color:{C.white};">
    <p style="margin:0;font-size:14px;line-height:20px;color:{C.gray_500};">Si vous n&apos;avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.</p>
  </td>
</tr>"""

    return _layout(
        settings=settings,
        title="Réinitialisation du mot de passe",
        main_html=main_html,
        cta_html=cta_html,
        secondary_html=secondary_html,
    )
