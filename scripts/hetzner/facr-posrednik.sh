#!/usr/bin/env bash
# Posrednik za IS FAČR (is.fotbal.cz) in frf-ajf.ro na strežniku SLFF.
#
# IS FAČR odgovarja le z omrežij v EU; GitHubovi tekači (Microsoft, ZDA) ne
# dobijo niti povezave. Uvoz zato še vedno teče na GitHubu, le zahtevki k
# is.fotbal.cz gredo prek tega posrednika (FACR_PROXY v skrivnostih GitHuba).
#
# Strežnika to ne obremeni: tinyproxy samo prepušča šifrirano povezavo
# (CONNECT), vsebine ne odpira. Dovoli le is.fotbal.cz:443 in www.frf-ajf.ro:443, zahteva geslo,
# največ 5 hkratnih povezav, systemd ga omeji na 20 % enega jedra in 64 MB.
#
# Zagon (enkrat):
#   ssh SLFF 'bash -s' < scripts/hetzner/facr-posrednik.sh
#   ssh SLFF cat /root/facr-proxy-url | gh secret set FACR_PROXY
# Ponoven zagon ohrani geslo (iz /root/facr-proxy-url), skrivnost ostane veljavna.
set -euo pipefail

DEBIAN_FRONTEND=noninteractive apt-get install -y -qq tinyproxy >/dev/null
umask 077
GESLO=$(sed -nE 's|^http://slff:([0-9a-f]+)@.*|\1|p' /root/facr-proxy-url 2>/dev/null || true)
[ -n "$GESLO" ] || GESLO=$(openssl rand -hex 24)

cat > /etc/tinyproxy/tinyproxy.conf <<EOF
# SLFF: posrednik SAMO za is.fotbal.cz (FAČR). Glej scripts/hetzner/facr-posrednik.sh.
User tinyproxy
Group tinyproxy
Port 31288
Listen 0.0.0.0
Timeout 60
DefaultErrorFile "/usr/share/tinyproxy/default.html"
LogFile "/var/log/tinyproxy/tinyproxy.log"
LogLevel Notice
PidFile "/run/tinyproxy/tinyproxy.pid"
MaxClients 5
BasicAuth slff ${GESLO}
ConnectPort 443
Filter "/etc/tinyproxy/dovoljeni"
FilterType ere
FilterDefaultDeny Yes
DisableViaHeader Yes
EOF
# is.fotbal.cz (FAČR) in www.frf-ajf.ro (Romunija: Cloudflare zavrne ameriške
# podatkovne centre, 10. 10. 2026).
printf '%s\n' '^is\.fotbal\.cz$' '^www\.frf-ajf\.ro$' > /etc/tinyproxy/dovoljeni
chown root:tinyproxy /etc/tinyproxy/tinyproxy.conf /etc/tinyproxy/dovoljeni
chmod 640 /etc/tinyproxy/tinyproxy.conf /etc/tinyproxy/dovoljeni

# Ubuntujev profil AppArmor tinyproxyju dovoli brati le tinyproxy.conf; brez
# tega pade ob zagonu z "filter file: Permission denied" (8. 10. 2026).
mkdir -p /etc/apparmor.d/local
echo 'file r /etc/tinyproxy/dovoljeni,' > /etc/apparmor.d/local/tinyproxy
apparmor_parser -r /etc/apparmor.d/tinyproxy

mkdir -p /etc/systemd/system/tinyproxy.service.d
printf '[Service]\nCPUQuota=20%%\nMemoryMax=64M\nNice=10\n' > /etc/systemd/system/tinyproxy.service.d/omejitve.conf

IP=$(curl -s -4 --max-time 10 https://ifconfig.me)
echo "http://slff:${GESLO}@${IP}:31288" > /root/facr-proxy-url
chmod 600 /root/facr-proxy-url

systemctl daemon-reload
systemctl enable -q tinyproxy
systemctl restart tinyproxy
ufw allow 31288/tcp comment 'tinyproxy FACR' >/dev/null

sleep 1
systemctl is-active tinyproxy || { journalctl -u tinyproxy -n 5 --no-pager; exit 1; }
# Preverba: is.fotbal.cz gre skozi, vse drugo ne.
U=$(cat /root/facr-proxy-url)
echo "is.fotbal.cz: $(curl -s -o /dev/null -w '%{http_code}' -m 20 -x "$U" https://is.fotbal.cz/public/?sport=fotbal)"
echo "drugo (mora pasti): $(curl -s -o /dev/null -w '%{http_code}' -m 10 -x "$U" https://example.com/ || true)"
