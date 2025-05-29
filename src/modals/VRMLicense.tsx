import { ModalProps } from '@fleur/mordred';
import { VRM0Meta, VRM1Meta, VRMMeta } from '@pixiv/three-vrm';
import { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { Button } from '../components/Button';
import { ExternalLink } from '../components/ExternalLink';
import { ModalBase } from '../components/ModalBase';
import { useTranslation } from '../hooks/useTranslation';
import { emptyCoalesce, isEmpty } from '../utils/lang';

export function VRMLicense({
  meta,
  onClose,
}: ModalProps<{ meta: VRMMeta }, void>) {
  const t = useTranslation('common');

  const body =
    meta.metaVersion === '0' ? (
      <VRM0License meta={meta} />
    ) : (
      <VRM1License meta={meta} />
    );

  return (
    <ModalBase
      onClose={onClose}
      header={<h1>{t('vrmLicense/title')}</h1>}
      content={<div>{body}</div>}
      footer={
        <>
          <Button kind="primary" onClick={onClose}>
            {t('ok')}
          </Button>
        </>
      }
    />
  );
}

function VRM0License({ meta }: { meta: VRM0Meta }) {
  const t = useTranslation('common');

  return (
    <>
      <Heading>{t('vrmLicense/metadata')}</Heading>
      <TableLike>
        <Row>
          <Cell>{t('vrmLicense/metaVersion')} </Cell>
          <Cell>{emptyCoalesce(meta.metaVersion, <Unknown />)}</Cell>
        </Row>
        <Row>
          <Cell>{t('vrmLicense/avatarName')}</Cell>
          <Cell>{emptyCoalesce(meta.title, <Unknown />)}</Cell>
        </Row>
        <Row>
          <Cell>{t('vrmLicense/version')}</Cell>
          <Cell>{emptyCoalesce(meta.version, <Unknown />)}</Cell>
        </Row>
        <Row>
          <Cell>{t('vrmLicense/reference')}</Cell>
          <Cell>{emptyCoalesce(meta.reference, <Unknown />)}</Cell>
        </Row>
        <Row>
          <Cell>{t('vrmLicense/author')}</Cell>
          <Cell>{emptyCoalesce(meta.author, <Unknown />)}</Cell>
        </Row>
        <Row>
          <Cell>{t('vrmLicense/contact')}</Cell>
          <Cell>{emptyCoalesce(meta.contactInformation, <Unknown />)}</Cell>
        </Row>
      </TableLike>

      <Heading>{t('vrmLicense/conditions')}</Heading>
      <TableLike>
        <Row>
          <Cell>{t('vrm0License/allowedUserName')}</Cell>
          <Cell>
            {meta.allowedUserName ? (
              <OkNg
                ok={
                  // prettier-ignore
                  meta.allowedUserName === 'Everyone' ? true
                    : meta.allowedUserName === 'ExplicitlyLicensedPerson' ? 'conditional'
                    : false
                }
              >
                {t(`vrm0License/allowedUserName/${meta.allowedUserName}`)}
              </OkNg>
            ) : (
              <Unknown />
            )}
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm0License/violentUssageName')}</Cell>
          <Cell>
            {meta.violentUssageName ? (
              <OkNg ok={meta.violentUssageName === 'Allow'}>
                {t(`vrm0License/violentUssageName/${meta.violentUssageName}`)}
              </OkNg>
            ) : (
              <Unknown />
            )}
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm0License/sexualUssageName')}</Cell>
          <Cell>
            {meta.sexualUssageName ? (
              <OkNg ok={meta.sexualUssageName === 'Allow'}>
                {t(`vrm0License/sexualUssageName/${meta.sexualUssageName}`)}
              </OkNg>
            ) : (
              <Unknown />
            )}
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm0License/commercialUssageName')}</Cell>
          <Cell>
            {meta.commercialUssageName ? (
              <OkNg ok={meta.commercialUssageName === 'Allow'}>
                {t(
                  `vrm0License/commercialUssageName/${meta.commercialUssageName}`
                )}
              </OkNg>
            ) : (
              <Unknown />
            )}
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm0License/otherPermissionUrl')}</Cell>
          <Cell>
            {isEmpty(meta.otherPermissionUrl) ? (
              <Unknown />
            ) : (
              <ExternalLink href={meta.otherPermissionUrl}>
                {meta.otherPermissionUrl}
              </ExternalLink>
            )}
          </Cell>
        </Row>
      </TableLike>

      <Heading>{t('vrmLicense/redistributionLicense')}</Heading>

      <TableLike>
        <Row>
          <Cell>{t('vrm0License/licenseName')}</Cell>
          <Cell>
            {meta.licenseName ? (
              t(`vrm0License/licenseName/${meta.licenseName}`)
            ) : (
              <Unknown />
            )}
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm0License/otherLicenseUrl')}</Cell>
          <Cell>
            {isEmpty(meta.otherLicenseUrl) ? (
              <Unknown />
            ) : (
              <ExternalLink href={meta.otherLicenseUrl}>
                {meta.otherLicenseUrl}
              </ExternalLink>
            )}
          </Cell>
        </Row>
      </TableLike>
    </>
  );
}

function VRM1License({ meta }: { meta: VRM1Meta }) {
  const t = useTranslation('common');

  return (
    <>
      <Heading>{t('vrmLicense/metadata')}</Heading>
      <TableLike>
        <Row>
          <Cell>{t('vrmLicense/metaVersion')} </Cell>
          <Cell>{emptyCoalesce(meta.metaVersion, <Unknown />)}</Cell>
        </Row>
        <Row>
          <Cell>{t('vrmLicense/avatarName')} </Cell>
          <Cell>
            {emptyCoalesce(meta.name, <Unknown />)}
            {meta.copyrightInformation && (
              <div
                css={css`
                  margin-top: 2px;
                  font-size: 14px;
                  color: #666;
                `}
              >
                {meta.copyrightInformation}
              </div>
            )}
          </Cell>
        </Row>
        <Row>
          <Cell>{t('vrmLicense/version')}</Cell>
          <Cell>{emptyCoalesce(meta.version, <Unknown />)}</Cell>
        </Row>
        <Row>
          <Cell>{t('vrmLicense/reference')}</Cell>
          <Cell>
            {isEmpty(meta.references) ? (
              <None />
            ) : (
              <ul>
                {meta.references.map((reference, idx) => (
                  <li key={idx}>{reference}</li>
                ))}
              </ul>
            )}
          </Cell>
        </Row>
        <Row>
          <Cell>{t('vrmLicense/authors')}</Cell>
          <Cell>
            {isEmpty(meta.authors) ? <Unknown /> : meta.authors.join(', ')}
          </Cell>
        </Row>
        <Row>
          <Cell>{t('vrmLicense/contact')}</Cell>
          <Cell>{emptyCoalesce(meta.contactInformation, <None />)}</Cell>
        </Row>
      </TableLike>

      <Heading>{t('vrmLicense/conditions')}</Heading>

      <TableLike>
        <Row>
          <Cell>{t('vrm1License/licenseUrl')}</Cell>
          <Cell>
            <ExternalLink href={meta.licenseUrl}>
              {meta.licenseUrl}
            </ExternalLink>
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm1License/avatarPermission')}</Cell>
          <Cell>
            <OkNg
              ok={
                // prettier-ignore
                meta.avatarPermission === 'everyone' ? true
                  : meta.avatarPermission === 'onlySeparatelyLicensedPerson' ? 'conditional'
                  : false // default to 'onlyAuthor'
              }
            >
              {t(
                `vrm1License/avatarPermission/${
                  meta.avatarPermission ?? 'onlyAuthor'
                }`
              )}
            </OkNg>
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm1License/allowExcessivelyViolentUsage')}</Cell>
          <Cell>
            <OkNg ok={meta.allowExcessivelyViolentUsage ?? false}>
              {t(
                `vrm1License/allowExcessivelyViolentUsage/${
                  meta.allowExcessivelyViolentUsage ?? false
                }`
              )}
            </OkNg>
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm1License/allowExcessivelySexualUsage')}</Cell>
          <Cell>
            <OkNg ok={meta.allowExcessivelySexualUsage ?? false}>
              {t(
                `vrm1License/allowExcessivelySexualUsage/${
                  meta.allowExcessivelySexualUsage ?? false
                }`
              )}
            </OkNg>
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm1License/commercialUsage')}</Cell>
          <Cell>
            <OkNg
              ok={
                // prettier-ignore
                meta.commercialUsage === 'personalNonProfit' ? false
                : meta.commercialUsage === 'personalProfit' ? 'conditional'
                : meta.commercialUsage === 'corporation' ? true
                : false // default to 'personalNonProfit'
              }
            >
              {t(
                `vrm1License/commercialUsage/${
                  meta.commercialUsage ?? 'personalNonProfit'
                }`
              )}
            </OkNg>
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm1License/allowPoliticalOrReligiousUsage')}</Cell>
          <Cell>
            <OkNg ok={meta.allowPoliticalOrReligiousUsage ?? false}>
              {t(
                `vrm1License/allowPoliticalOrReligiousUsage/${
                  meta.allowPoliticalOrReligiousUsage ?? false
                }`
              )}
            </OkNg>
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm1License/allowAntisocialOrHateUsage')}</Cell>
          <Cell>
            <OkNg ok={meta.allowAntisocialOrHateUsage ?? false}>
              {t(
                `vrm1License/allowAntisocialOrHateUsage/${
                  meta.allowAntisocialOrHateUsage ?? false
                }`
              )}
            </OkNg>
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm1License/creditNotation')}</Cell>
          <Cell>
            <OkNg ok={(meta.creditNotation ?? 'required') === 'unnecessary'}>
              {t(
                `vrm1License/creditNotation/${
                  meta.creditNotation ?? 'required'
                }`
              )}
            </OkNg>
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm1License/allowRedistribution')}</Cell>
          <Cell>
            <OkNg ok={meta.allowRedistribution ?? false}>
              {t(
                `vrm1License/allowRedistribution/${
                  meta.allowRedistribution ?? false
                }`
              )}
            </OkNg>
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm1License/modification')}</Cell>
          <Cell>
            <OkNg
              ok={
                // prettier-ignore
                meta.modification === 'allowModificationRedistribution' ? true
              : meta.modification === 'allowModification' ? 'conditional'
              : false // default to 'prohibited'
              }
            >
              {t(
                `vrm1License/modification/${meta.modification ?? 'prohibited'}`
              )}
            </OkNg>
          </Cell>
        </Row>

        <Row>
          <Cell>{t('vrm0License/otherLicenseUrl')}</Cell>
          <Cell>
            {isEmpty(meta.otherLicenseUrl) ? (
              <None />
            ) : (
              <ExternalLink href={meta.otherLicenseUrl}>
                {meta.otherLicenseUrl}
              </ExternalLink>
            )}
          </Cell>
        </Row>
      </TableLike>
    </>
  );
}

const Unknown = () => {
  const t = useTranslation('common');
  return <GreyText>{t('vrmLicense/unknown')}</GreyText>;
};

const None = () => {
  const t = useTranslation('common');
  return <GreyText>{t('vrmLicense/none')}</GreyText>;
};

const OkNg = ({
  ok,
  children,
}: {
  ok: boolean | 'conditional';
  children: ReactNode;
}) => (
  <span
    style={{
      fontWeight: 'bold',
      color: ok === 'conditional' ? '#e0b424' : ok ? '#6dc05e' : '#e04444',
    }}
  >
    {children}
  </span>
);

const Heading = styled.h1`
  margin: 24px 0 16px;
  font-weight: bold;
`;

const GreyText = styled.span`
  color: #c6c6c6;
`;

const TableLike = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
`;

const Row = styled.div`
  display: contents;
  border-bottom: 1px solid #000;
`;

const Cell = styled.div`
  padding: 4px 0;
  line-height: 1.4;
  word-break: break-all;
`;
