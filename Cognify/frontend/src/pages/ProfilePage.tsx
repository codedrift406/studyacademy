import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Save, Bell } from "lucide-react";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { authFetch } from "../lib/api";
import { usePreferences } from "../context/PreferencesContext";
import styles from './profile.module.css'

interface Profile {
  id: string;
  email: string;
  name: string | null;
  nickname: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  xp: number;
  streakDays: number;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface IntegrationItem {
  provider: string;
  webhook: string | null;
  enabled: boolean;
}

export const ProfilePage = () => {
  const { t } = usePreferences();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [integrationForm, setIntegrationForm] = useState<
    Record<string, { webhook: string; enabled: boolean }>
  >({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [profileRes, notificationsRes] = await Promise.all([
      authFetch("/api/profile/me"),
      authFetch("/api/notifications/me"),
    ]);

    let role: string | null = null;
    if (profileRes.ok) {
      const data = await profileRes.json();
      const p = data.profile as Profile;
      setProfile(p);
      setName(p.name || "");
      setNickname(p.nickname || "");
      setBio(p.bio || "");
      setAvatarUrl(p.avatarUrl || "");
      role = p.role;
    }

    if (notificationsRes.ok) {
      const data = await notificationsRes.json();
      setNotifications((data.notifications || []) as NotificationItem[]);
    }

    if (role === "TEACHER" || role === "ADMIN") {
      const integrationRes = await authFetch("/api/integrations/me");
      if (integrationRes.ok) {
        const integrationData = await integrationRes.json();
        const items = (integrationData.integrations || []) as IntegrationItem[];
        const form: Record<string, { webhook: string; enabled: boolean }> = {};
        items.forEach((item) => {
          form[item.provider] = {
            webhook: item.webhook || "",
            enabled: item.enabled,
          };
        });
        setIntegrationForm(form);
      }
    }
  };

  useEffect(() => {
    load().catch((error) => console.error(error));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nickname, bio, avatarUrl }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setProfile(data.profile);
      localStorage.setItem("user", JSON.stringify(data.profile));

      if (avatarFile) {
        const form = new FormData();
        form.append("file", avatarFile);
        const uploadRes = await authFetch("/api/media/avatar", {
          method: "POST",
          body: form,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          setAvatarUrl(uploadData.avatarUrl || "");
          setProfile((prev) =>
            prev ? { ...prev, avatarUrl: uploadData.avatarUrl || null } : prev,
          );
          const rawUser = localStorage.getItem("user");
          if (rawUser) {
            const parsed = JSON.parse(rawUser) as Record<string, unknown>;
            parsed.avatarUrl = uploadData.avatarUrl;
            localStorage.setItem("user", JSON.stringify(parsed));
          }
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const markAllRead = async () => {
    await authFetch("/api/notifications/me/read-all", {
      method: "POST",
    });
    load().catch((error) => console.error(error));
  };

  const providers = ["telegram", "email", "google_classroom", "moodle"];

  const saveIntegration = async (provider: string) => {
    const item = integrationForm[provider] || { webhook: "", enabled: false };
    await authFetch(`/api/integrations/me/${provider}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    load().catch((error) => console.error(error));
  };

  const testIntegration = async (provider: string) => {
    await authFetch(`/api/integrations/me/${provider}/test`, {
      method: "POST",
    });
  };

  return (
    <div
      className={`glass-panel ${styles.body} ${styles.profileCard}`}
      style={{ display: "grid", gap: "2rem" }}
    >
      <Card interactive>
        <CardBody className="hello" >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h1
              className="text-gradient"
              style={{ fontSize: "2rem", marginBottom: "0.9rem" }}
            >
              {t("profile.title", "Профиль")}
            </h1>
          </div>
          {avatarUrl && (
            <div
              style={{
                marginBottom: "0.9rem",
                width: 300,
                height: 300,
                borderRadius: "50%",
                overflow: "hidden",
                border: "white solid 4px",
              }}
            >
              <img
                src={avatarUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          )}
          <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
            <Input
              label={t("profile.fullName", "Полное имя")}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              label={t("profile.nickname", "Никнейм")}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
            <Input
              label={t("profile.photoUrl", "URL фото")}
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
            <label>
              <div
                style={{
                  marginBottom: "0.35rem",
                  color: "var(--text-secondary)",
                }}
              >
                {t("profile.uploadAvatar", "Загрузить аватар")}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setAvatarFile(event.target.files?.[0] || null)
                }
              />
            </label>
            <label style={{ display: "block" }}>
              <div
                style={{
                  marginBottom: "0.35rem",
                  color: "var(--text-secondary)",
                }}
              >
                {t("profile.description", "Описание")}
              </div>
              <textarea
                className={styles.bioTextarea}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-glass)",
                  borderRadius: 10,
                  padding: "0.65rem",
                }}
              />
            </label>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: "1rem",
              }}
            >
              <Button type="submit" icon={<Save size={16} />} disabled={saving}>
                {saving
                  ? t("profile.saving", "Сохранение...")
                  : t("profile.saveButton", "Сохранить профиль")}
              </Button>
              <div
                className="glass-panel"
                style={{
                  padding: "0.5rem 1rem",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "center",
                  borderRadius: "12px",
                }}
              >
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 600 }}
                >
                  {t("profile.xp", "XP:")}{" "}
                  <span style={{ color: "var(--primary-light)" }}>
                    {profile?.xp ?? 0}
                  </span>
                </span>
                <div
                  style={{
                    width: "1px",
                    height: "14px",
                    background: "var(--border-glass)",
                  }}
                />
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 600 }}
                >
                  {t("profile.streak", "Серия:")}{" "}
                  <span style={{ color: "var(--secondary)" }}>
                    {profile?.streakDays ?? 0}
                  </span>{" "}
                  {t("profile.days", "дней")} 🔥
                </span>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card interactive>
        <CardBody>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              borderBottom: "1px solid var(--border-glass)",
              paddingBottom: "0.5rem",
            }}
          >
            <h3
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--text-primary)",
              }}
            >
              <Bell size={18} className="text-primary" />{" "}
              {t("profile.notifications", "Уведомления")}
            </h3>
            <Button size="sm" variant="secondary" onClick={markAllRead}>
              {t("profile.markAllRead", "Отметить все как прочитанные")}
            </Button>
          </div>
          {notifications.length === 0 ? (
            <p style={{ color: "var(--text-secondary)" }}>
              {t("profile.noNotifications", "Уведомлений пока нет.")}
            </p>
          ) : (
            notifications.slice(0, 15).map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "0.6rem 0",
                  borderTop: "1px solid var(--border-glass)",
                }}
              >
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                <div style={{ color: "var(--text-secondary)" }}>
                  {item.message}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {(profile?.role === "TEACHER" || profile?.role === "ADMIN") && (
        <Card interactive style={{ marginTop: "1rem" }}>
          <CardBody>
            <h3 style={{ marginBottom: "0.75rem", fontSize: "1.4rem" }}>
              {t("profile.integrations", "Интеграции")}
            </h3>
            <p
              style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}
            >
              {t(
                "profile.integrationsDesc",
                "Google Classroom, Moodle, Telegram и Email через webhook-эндпоинты.",
              )}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              {providers.map((provider) => {
                const item = integrationForm[provider] || {
                  webhook: "",
                  enabled: false,
                };
                return (
                  <div
                    key={provider}
                    className="glass-panel"
                    style={{ padding: "1rem" }}
                  >
                    <div
                      style={{
                        marginBottom: "0.8rem",
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {provider.replace("_", " ")}
                    </div>
                    <input
                      className="glass-input"
                      value={item.webhook}
                      onChange={(e) =>
                        setIntegrationForm((prev) => ({
                          ...prev,
                          [provider]: { ...item, webhook: e.target.value },
                        }))
                      }
                      placeholder={t("profile.webhookUrl", "URL webhook")}
                      style={{
                        width: "100%",
                        padding: "0.65rem 1rem",
                        marginBottom: "0.8rem",
                      }}
                    />
                    <label
                      style={{
                        display: "flex",
                        gap: "0.45rem",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          setIntegrationForm((prev) => ({
                            ...prev,
                            [provider]: { ...item, enabled: e.target.checked },
                          }))
                        }
                      />
                      {t("profile.enabled", "Включено")}
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Button
                        size="sm"
                        onClick={() => saveIntegration(provider)}
                      >
                        {t("profile.save", "Сохранить")}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => testIntegration(provider)}
                      >
                        {t("profile.test", "Тест")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
