import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardBody } from '../components/ui/Card';

interface CertificateResponse {
  valid: boolean;
  certificate: {
    code: string;
    score: number;
    issuedAt: string;
    student: {
      id: string;
      name: string | null;
      email: string;
    };
    course: {
      id: string;
      title: string;
    };
  };
}

export const CertificateVerifyPage = () => {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CertificateResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!code) return;
      try {
        const res = await fetch(`/api/assessments/certificate/${code}`);
        if (!res.ok) {
          setError('Certificate not found or invalid.');
          return;
        }
        const payload = (await res.json()) as CertificateResponse;
        setData(payload);
      } catch {
        setError('Could not verify certificate right now.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [code]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
      <Card style={{ width: 'min(680px, 100%)' }}>
        <CardBody>
          <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Cognify Certificate Verification
          </h1>

          {loading && <p>Verifying...</p>}
          {!loading && error && <p style={{ color: '#ef4444' }}>{error}</p>}

          {!loading && data?.valid && (
            <div style={{ display: 'grid', gap: '0.55rem' }}>
              <p>
                Status: <strong style={{ color: 'var(--success)' }}>Valid</strong>
              </p>
              <p>
                Certificate code: <strong>{data.certificate.code}</strong>
              </p>
              <p>
                Student: <strong>{data.certificate.student.name || data.certificate.student.email}</strong>
              </p>
              <p>
                Course: <strong>{data.certificate.course.title}</strong>
              </p>
              <p>
                Score: <strong>{data.certificate.score}%</strong>
              </p>
              <p>
                Issued: <strong>{new Date(data.certificate.issuedAt).toLocaleString()}</strong>
              </p>
              <a
                href={`/api/assessments/certificate/${data.certificate.code}/pdf`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--primary)' }}
              >
                Download PDF
              </a>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
