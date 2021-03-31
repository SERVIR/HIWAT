from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from tethys_sdk.gizmos import Button,SelectInput
from tethysapp.hiwat.config import geoserver
from tethysapp.hiwat.utils import generate_variables_meta,get_thredds_info,get_hiwat_file
from tethysapp.hiwat.hiwat import det_time_options,hourly_time_options
import json


def home(request):
    """
    Controller for the app home page.
    """
    variable_options = [('Total Precipitation(mm)', 'APCP_surface'),
                        ('Convective Available Potential Energy(J/kg)', 'CAPE_surface'),
                        ('Dew Point Temperature(C)', 'DPT_2maboveground'),
                        ('Geopotential Height(m)','HGT_500mb'),
                        ('0-3 km Storm Relative Helicity(m^2/s^2)','HLCY_0M3000maboveground'),
                        ('Temparature 2m above ground(C)','TMP_2maboveground'),
                        ('Hourly Precipitation(mm)', 'PCP'),
                        ('Pressure Reduced To MSL(hPa)', 'PRMSL_meansealevel'),
                        ('Wind Direction 10m above ground(m)','WDIR_10maboveground'),
                        ('Wind Direction 250 mb(degress)', 'WDIR_250mb'),
                        ('Wind Speed 10m(m/s)', 'WIND_10maboveground'),
                        ('Wind Speed(m/s)', 'WIND_250mb')]

    # Select Variable Dropdown
    select_variable = SelectInput(display_text='Select HIWAT Variable',
                                  name='select_variable',
                                  multiple=False,
                                  options=variable_options,
                                  initial=['Total Accumulated Precipitation(mm)'])

    geoserver_wms_url = geoserver["wms_url"]

    try:
    	hiwat_files = get_hiwat_file()

    	det_options = det_time_options(hiwat_files['det'], 'det')

    	hourly_options = hourly_time_options(hiwat_files['hourly'], 'hourly')
    except:

    	det_options = {}
    	hourly_options = {} 





    context = {
        'select_variable':select_variable,
        'geoserver_wms_url':geoserver_wms_url,
        # 'var_options':json.dumps(var_options),
        'det_options':json.dumps(det_options),
        'hourly_options':json.dumps(hourly_options)
    }

    return render(request, 'hiwat/home.html', context)

def leaf(request):
    """
    Controller for the app home page.
    """
    variable_options = [('Total Precipitation(mm)', 'APCP_surface'),
                        ('Convective Available Potential Energy(J/kg)', 'CAPE_surface'),
                        ('Dew Point Temperature(C)', 'DPT_2maboveground'),
                        ('Geopotential Height(m)','HGT_500mb'),
                        ('0-3 km Storm Relative Helicity(m^2/s^2)','HLCY_0M3000maboveground'),
                        ('Temparature 2m above ground(C)','TMP_2maboveground'),
                        ('Hourly Precipitation(mm)', 'PCP'),
                        ('Pressure Reduced To MSL(hPa)', 'PRMSL_meansealevel'),
                        ('Wind Direction 10m above ground(m)','WDIR_10maboveground'),
                        ('Wind Direction 250 mb(degress)', 'WDIR_250mb'),
                        ('Wind Speed 10m(m/s)', 'WIND_10maboveground'),
                        ('Wind Speed(m/s)', 'WIND_250mb')]

    # Select Variable Dropdown
    select_variable = SelectInput(display_text='Select HIWAT Variable',
                                  name='select_variable',
                                  multiple=False,
                                  options=variable_options,
                                  initial=['Total Accumulated Precipitation(mm)'])

    geoserver_wms_url = geoserver["wms_url"]

    thredds_wms_obj = get_thredds_info()

    var_options = generate_variables_meta()


    try:
    	hiwat_files = get_hiwat_file()

    	det_options = det_time_options(hiwat_files['det'], 'det')

    	hourly_options = hourly_time_options(hiwat_files['hourly'], 'hourly')
    except:

    	det_options = {}
    	hourly_options = {} 

    context = {
        'select_variable':select_variable,
        'geoserver_wms_url':geoserver_wms_url,
        'thredds_urls':json.dumps(thredds_wms_obj),
        'var_options':json.dumps(var_options),
        'det_options':json.dumps(det_options),
        'hourly_options':json.dumps(hourly_options)
    }

    return render(request, 'hiwat/leaf.html', context)