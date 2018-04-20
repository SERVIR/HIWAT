#Note: Do not put a slash at the end of theurl. Even if you do there is an if statement to take care of it.
geoserver = {'rest_url':'http://127.0.0.1:8181/geoserver/rest',
             'wms_url':'https://tethysdev.servirglobal.net/geoserver/wms',
             'wfs_url':'http://127.0.0.1:8181/geoserver/wfs',
             'user':'admin',
             'password':'geoserver',
             'workspace':'hiwat'}

HIWAT_FILE = '/media/sf_Downloads/wrf_hkh_12km_met_fields_2018030518.latlon'

HIWAT_DET = '/media/sf_Downloads/wrf_hkh_nc/hkhControl_20180329-1800_latlon.nc'

HIWAT_HOURLY = '/media/sf_Downloads/wrf_hkh_nc/hkhEnsemble_20180329-1800_hourly_latlon.nc'

HIWAT_DAY1 = '/media/sf_Downloads/wrf_hkh_nc/hkhEnsemble_20180329-1800_day1_latlon.nc'

HIWAT_DAY2 = '/media/sf_Downloads/wrf_hkh_nc/hkhEnsemble_20180329-1800_day2_latlon.nc'

ROOT_OUTPUT_DIR = '/media/sf_Downloads/hiwat_data/'

COLORS_PICKLE = '/media/sf_Downloads/wrf_hkh_nc/gradscolors.pkl'