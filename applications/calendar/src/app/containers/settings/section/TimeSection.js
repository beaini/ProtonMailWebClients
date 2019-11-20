import React, { useState, useMemo } from 'react';
import {
    SubTitle,
    Row,
    Label,
    Field,
    Select,
    Loader,
    useEventManager,
    useCalendarUserSettings,
    useNotifications,
    useApi,
    useLoading,
    Checkbox
} from 'react-components';
import { c } from 'ttag';
import { updateCalendarUserSettings } from 'proton-shared/lib/api/calendars';
import updateLongLocale from 'proton-shared/lib/i18n/updateLongLocale';

import TimezoneSelector from '../../../components/TimezoneSelector';
import { SETTINGS_DATE_FORMAT, SETTINGS_TIME_FORMAT } from '../../../constants';
import { getTimezone } from 'proton-shared/lib/date/timezone';

const TimeSection = () => {
    const year = useMemo(() => new Date().getFullYear(), []);
    const [timezone] = useState(() => getTimezone());
    const api = useApi();
    const { call } = useEventManager();
    const { createNotification } = useNotifications();

    const [loadingDateFormat, withLoadingDateFormat] = useLoading();
    const [loadingTimeFormat, withLoadingTimeFormat] = useLoading();
    const [loadingAutoDetect, withLoadingAutoDetect] = useLoading();
    const [loadingPrimaryTimeZone, withLoadingPrimaryTimeZone] = useLoading();
    const [loadingSecondaryTimeZone, withLoadingSecondaryTimeZone] = useLoading();
    const [loadingDisplaySecondaryTimezone, withLoadingDisplaySecondaryTimezone] = useLoading();

    const [calendarSettings, loadingCalendarSettings] = useCalendarUserSettings();

    const handleChange = async (data) => {
        await api(updateCalendarUserSettings(data));
        await call();
        createNotification({ text: c('Success').t`Preference saved` });
    };

    const handleTimeFormat = async (value) => {
        await api(updateCalendarUserSettings({ TimeFormat: value }));
        await call();
        updateLongLocale({ displayAMPM: value === SETTINGS_TIME_FORMAT.H12 });
        createNotification({ text: c('Success').t`Preference saved` });
    };

    if (loadingCalendarSettings) {
        return (
            <>
                <SubTitle>{c('Title').t`Region & time zone`}</SubTitle>
                <Loader />
            </>
        );
    }

    const {
        AutoDetectPrimaryTimezone,
        DisplaySecondaryTimezone,
        DateFormat,
        TimeFormat,
        PrimaryTimezone,
        SecondaryTimezone
    } = calendarSettings;

    const primaryTimezoneValue = AutoDetectPrimaryTimezone ? timezone : PrimaryTimezone || timezone;
    const secondaryTimezoneValue = DisplaySecondaryTimezone
        ? SecondaryTimezone || timezone
        : SecondaryTimezone || timezone;

    return (
        <>
            <SubTitle>{c('Title').t`Region & time zone`}</SubTitle>
            <Row>
                <Label htmlFor="date-format-select">{c('Label').t`Date format`}</Label>
                <Field>
                    <Select
                        id="date-format-select"
                        loading={loadingDateFormat}
                        onChange={({ target }) => withLoadingDateFormat(handleChange({ DateFormat: +target.value }))}
                        value={DateFormat}
                        options={[
                            { text: `12/31/${year}`, value: SETTINGS_DATE_FORMAT.DDMMYYYY },
                            { text: `31/12/${year}`, value: SETTINGS_DATE_FORMAT.MMDDYYYY },
                            { text: `${year}-12-31`, value: SETTINGS_DATE_FORMAT.YYYYMMDD }
                        ]}
                    />
                </Field>
            </Row>
            <Row>
                <Label htmlFor="time-format-select">{c('Label').t`Time format`}</Label>
                <Field>
                    <Select
                        id="time-format-select"
                        loading={loadingTimeFormat}
                        onChange={({ target }) => withLoadingTimeFormat(handleTimeFormat(+target.value))}
                        value={TimeFormat}
                        options={[
                            { text: '12h', value: SETTINGS_TIME_FORMAT.H12 },
                            { text: '24h', value: SETTINGS_TIME_FORMAT.H24 }
                        ]}
                    />
                </Field>
            </Row>
            <Row>
                <Label>{c('Primary timezone').t`Primary time zone`}</Label>
                <Field className="pt0-25">
                    <div className="mb1">
                        <Checkbox
                            disabled={loadingAutoDetect}
                            checked={!!AutoDetectPrimaryTimezone}
                            onChange={({ target }) =>
                                withLoadingAutoDetect(
                                    handleChange({
                                        AutoDetectPrimaryTimezone: +target.checked,
                                        // Set a timezone if it's the first time
                                        PrimaryTimezone: !PrimaryTimezone ? primaryTimezoneValue : undefined
                                    })
                                )
                            }
                        >{c('Checkbox').t`Auto-detect`}</Checkbox>
                    </div>
                    <div>
                        <TimezoneSelector
                            loading={loadingPrimaryTimeZone}
                            disabled={!!AutoDetectPrimaryTimezone}
                            timezone={primaryTimezoneValue}
                            onChange={(PrimaryTimezone) =>
                                withLoadingPrimaryTimeZone(handleChange({ PrimaryTimezone }))
                            }
                        />
                    </div>
                </Field>
            </Row>
            <Row>
                <Label>{c('Secondary timezone').t`Secondary time zone`}</Label>
                <Field className="pt0-25">
                    <div className="mb1">
                        <Checkbox
                            disabled={loadingDisplaySecondaryTimezone}
                            checked={!!DisplaySecondaryTimezone}
                            onChange={({ target }) =>
                                withLoadingDisplaySecondaryTimezone(
                                    handleChange({
                                        DisplaySecondaryTimezone: +target.checked,
                                        // Set a timezone if it's the first time
                                        SecondaryTimezone: !SecondaryTimezone ? secondaryTimezoneValue : undefined
                                    })
                                )
                            }
                        >{c('Checkbox').t`Show secondary time zone`}</Checkbox>
                    </div>
                    <div>
                        <TimezoneSelector
                            loading={loadingSecondaryTimeZone}
                            disabled={!DisplaySecondaryTimezone}
                            timezone={secondaryTimezoneValue}
                            onChange={(SecondaryTimezone) =>
                                withLoadingSecondaryTimeZone(handleChange({ SecondaryTimezone }))
                            }
                        />
                    </div>
                </Field>
            </Row>
        </>
    );
};

export default TimeSection;
