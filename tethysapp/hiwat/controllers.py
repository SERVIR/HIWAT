from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from tethys_sdk.gizmos import Button,SelectInput


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

    context = {
        'select_variable':select_variable

    }

    return render(request, 'hiwat/home.html', context)