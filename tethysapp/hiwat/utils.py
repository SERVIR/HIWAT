import datetime
from collections import defaultdict,OrderedDict
import json
import operator
import os, tempfile, shutil,functools
import requests
import csv
import json
import calendar
import time
import netCDF4
from netCDF4 import Dataset
from config import *
import numpy as np
import shapely.geometry

def get_pt_values(s_var,geom_data,interval):

    #Empty list to store the timeseries values
    ts_plot = []

    json_obj = {}

    #Defining the lat and lon from the coords string
    coords = geom_data.split(',')
    stn_lat = float(coords[1])
    stn_lon = float(coords[0])

    nc_file = None

    if interval == 'det':
        nc_file = HIWAT_DET
    if interval == 'hourly':
        nc_file = HIWAT_HOURLY
    if interval == 'day1':
        nc_file = HIWAT_DAY1
    if interval == 'day2':
        nc_file = HIWAT_DAY2

    nc_fid = Dataset(nc_file, 'r') #Reading the netCDF file
    lis_var = nc_fid.variables
    lats = nc_fid.variables['latitude'][:]  #Defining the latitude array
    lons = nc_fid.variables['longitude'][:] #Defining the longitude array
    field = nc_fid.variables[s_var][:]   #Defning the variable array
    time = nc_fid.variables['time'][:]

    abslat = np.abs(lats - stn_lat) #Finding the absolute latitude
    abslon = np.abs(lons - stn_lon) #Finding the absolute longitude
    
    lat_idx = (abslat.argmin())
    lon_idx = (abslon.argmin())

    if interval == 'det':
        for timestep, v in enumerate(time):
            val = field[timestep, lat_idx, lon_idx]
            time_stamp = time[timestep] * 1000
            ts_plot.append([time_stamp,float(val)])
            ts_plot.sort()

    if interval == 'hourly':
        for timestep, v in enumerate(time):
            val = field[timestep, lat_idx, lon_idx]
            dt_str = netCDF4.num2date(lis_var['time'][timestep], units=lis_var['time'].units,
                                      calendar=lis_var['time'].calendar)
            # dt_str = datetime.datetime.strftime(dt_str, '%Y_%m_%d_%H_%M')
            time_stamp = calendar.timegm(dt_str.utctimetuple()) * 1000
            # time_stamp = time[timestep] * 1000
            ts_plot.append([time_stamp,float(val)])
            ts_plot.sort()

    if interval == 'day1' or interval == 'day2':
        val = field[0, lat_idx, lon_idx]
        dt_str = netCDF4.num2date(lis_var['time'][0], units=lis_var['time'].units,
                                  calendar=lis_var['time'].calendar)
        # dt_str = datetime.datetime.strftime(dt_str, '%Y_%m_%d_%H_%M')
        time_stamp = calendar.timegm(dt_str.utctimetuple()) * 1000
        ts_plot.append([time_stamp, float(val)])
        ts_plot.sort()

    # Returning the list with the timeseries values and the point so that they can be displayed on the graph.
    point = [round(stn_lat,2),round(stn_lon,2)]
    json_obj["plot"] = ts_plot
    json_obj["geom"] = point

    return json_obj


def get_poylgon_values(s_var, geom_data, interval):
    # Empty list to store the timeseries values
    ts_plot = []

    json_obj = {}

    # Defining the lat and lon from the coords string
    poly_geojson = json.loads(geom_data)
    shape_obj = shapely.geometry.asShape(poly_geojson)
    bounds = shape_obj.bounds

    miny = float(bounds[1])
    minx = float(bounds[0])
    maxx = float(bounds[2])
    maxy = float(bounds[3])

    nc_file = None

    if interval == 'det':
        nc_file = HIWAT_DET
    if interval == 'hourly':
        nc_file = HIWAT_HOURLY
    if interval == 'day1':
        nc_file = HIWAT_DAY1
    if interval == 'day2':
        nc_file = HIWAT_DAY2
    #
    nc_fid = Dataset(nc_file, 'r')  # Reading the netCDF file
    lis_var = nc_fid.variables
    lats = nc_fid.variables['latitude'][:]  # Defining the latitude array
    lons = nc_fid.variables['longitude'][:]  # Defining the longitude array
    field = nc_fid.variables[s_var][:]  # Defning the variable array
    time = nc_fid.variables['time'][:]
    abslat = np.abs(lats - miny)
    abslon = np.abs(lons - minx)
    abslat2 = np.abs(lats - maxy)
    abslon2 = np.abs(lons - maxx)
    lon_idx = (abslat.argmin())
    lat_idx = (abslon.argmin())
    lon2_idx = (abslat2.argmin())
    lat2_idx = (abslon2.argmin())
    #
    # lat_idx = (abslat.argmin())
    # lon_idx = (abslon.argmin())
    #
    if interval == 'det':
        for timestep, v in enumerate(time):
            vals = field[timestep,lat_idx:lat2_idx, lon_idx:lon2_idx]
            val = np.mean(vals)
            time_stamp = time[timestep] * 1000
            ts_plot.append([time_stamp, float(val)])
            ts_plot.sort()

    if interval == 'hourly':
        for timestep, v in enumerate(time):
            vals = field[timestep, lat_idx:lat2_idx, lon_idx:lon2_idx]
            val = np.mean(vals)
            dt_str = netCDF4.num2date(lis_var['time'][timestep], units=lis_var['time'].units,
                                      calendar=lis_var['time'].calendar)
            # dt_str = datetime.datetime.strftime(dt_str, '%Y_%m_%d_%H_%M')
            time_stamp = calendar.timegm(dt_str.utctimetuple()) * 1000
            # time_stamp = time[timestep] * 1000
            ts_plot.append([time_stamp, float(val)])
            ts_plot.sort()

    if interval == 'day1' or interval == 'day2':
        vals = field[0, lat_idx:lat2_idx, lon_idx:lon2_idx]
        val = np.mean(vals)
        dt_str = netCDF4.num2date(lis_var['time'][0], units=lis_var['time'].units,
                                  calendar=lis_var['time'].calendar)
        # dt_str = datetime.datetime.strftime(dt_str, '%Y_%m_%d_%H_%M')
        time_stamp = calendar.timegm(dt_str.utctimetuple()) * 1000
        ts_plot.append([time_stamp, float(val)])
        ts_plot.sort()

    geom = [round(minx,2),round(miny,2),round(maxx,2),round(maxy,2)]

    json_obj["plot"] = ts_plot
    json_obj["geom"] = geom

    return json_obj

# get_pt_values('TMP_2maboveground','91.1,20.7')
def generate_variables_meta():
    db_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'public/data/var_info.txt')
    variable_list = []
    with open(db_file, mode='r') as f:
        f.readline()  # Skip first line

        lines = f.readlines()

    for line in lines:
        if line != '':
            line = line.strip()
            linevals = line.split('|')
            variable_id = linevals[0]
            category = linevals[1]
            display_name = linevals[2]
            units = linevals[3]
            vmin = linevals[4]
            vmax = linevals[5]
            scale = calc_color_range(float(vmin),float(vmax))
            variable_list.append({
                'id': variable_id,
                'category':category,
                'display_name': display_name,
                'units': units,
                'min':vmin,
                'max':vmax,
                'scale':scale
            })

    return variable_list

def calc_color_range(min,max):

    interval = float(abs((max - min) / 20))

    if interval == 0:
        scale = [0] * 20
    else:
        scale = np.arange(min, max, interval).tolist()

    return scale


